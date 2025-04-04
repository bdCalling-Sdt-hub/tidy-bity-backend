const bcrypt = require("bcrypt");
const cron = require("node-cron");
const { status } = require("http-status");

const ApiError = require("../../../error/ApiError");
const Auth = require("./Auth");
const User = require("../user/User");
const Admin = require("../admin/Admin");
const config = require("../../../config");
const { jwtHelpers } = require("../../../helper/jwtHelpers");
const { ENUM_USER_ROLE } = require("../../../util/enum");
const { logger, errorLogger } = require("../../../shared/logger");
const codeGenerator = require("../../../util/codeGenerator");
const validateFields = require("../../../util/validateFields");
const EmailHelpers = require("../../../util/emailHelpers");

const registrationAccount = async (payload) => {
  const { role, firstName, lastName, password, confirmPassword, email } =
    payload;

  validateFields(payload, [
    "password",
    "confirmPassword",
    "email",
    "firstName",
    "lastName",
  ]);

  const { code: activationCode, expiredAt: activationCodeExpire } =
    codeGenerator(3);
  const authData = {
    role,
    firstName,
    lastName,
    email,
    password,
    activationCode,
    activationCodeExpire,
  };
  const data = {
    user: `${firstName} ${lastName}`,
    activationCode,
    activationCodeExpire: Math.round(
      (activationCodeExpire - Date.now()) / (60 * 1000)
    ),
  };

  if (!Object.values(ENUM_USER_ROLE).includes(role))
    throw new ApiError(status.BAD_REQUEST, "Invalid role");
  if (password !== confirmPassword)
    throw new ApiError(
      status.BAD_REQUEST,
      "Password and Confirm Password didn't match"
    );

  const user = await Auth.findOne({ email });
  if (user) {
    const message = user.isActive
      ? "Account active. Please Login"
      : "Already have an account. Please activate";

    if (!user.isActive) {
      user.activationCode = activationCode;
      user.activationCodeExpire = activationCodeExpire;
      await user.save();

      EmailHelpers.sendOtpResendEmail(email, data);
    }

    return {
      isActive: user.isActive,
      message,
    };
  }

  const auth = await Auth.create(authData);

  const userData = {
    authId: auth._id,
    firstName,
    lastName,
    email,
    ...(payload.phoneNumber && { phoneNumber: payload.phoneNumber }),
    ...(role === ENUM_USER_ROLE.USER && {
      firstLogin: null,
      trialExpires: null,
      isSubscribed: false,
    }),
  };

  if (role === ENUM_USER_ROLE.ADMIN) await Admin.create(userData);
  else await User.create(userData);

  if (role !== ENUM_USER_ROLE.ADMIN)
    EmailHelpers.sendActivationEmail(email, data);

  return {
    isActive: false,
    message: "Account created successfully. Please check your email",
  };
};

const resendActivationCode = async (payload) => {
  const email = payload.email;
  const user = await Auth.findOne({ email: email });
  if (!user) throw new ApiError(status.BAD_REQUEST, "Email not found!");

  const { code: activationCode, expiredAt: activationCodeExpire } =
    codeGenerator(3);
  const data = {
    user: `${user.firstName} ${user.lastName}`,
    activationCode,
    activationCodeExpire: Math.round(
      (activationCodeExpire - Date.now()) / (60 * 1000)
    ),
  };

  user.activationCode = activationCode;
  user.activationCodeExpire = activationCodeExpire;
  await user.save();

  EmailHelpers.sendOtpResendEmail(email, data);
};

const activateAccount = async (payload) => {
  const { activationCode, email } = payload;

  const auth = await Auth.findOne({ email });
  if (!auth) throw new ApiError(status.NOT_FOUND, "User not found");
  if (!auth.activationCode)
    throw new ApiError(
      status.NOT_FOUND,
      "Activation code not found. Get a new activation code"
    );
  if (auth.activationCode !== activationCode)
    throw new ApiError(status.BAD_REQUEST, "Code didn't match!");

  await Auth.updateOne(
    { email: email },
    { isActive: true },
    {
      new: true,
      runValidators: true,
    }
  );

  let result;
  switch (auth.role) {
    case ENUM_USER_ROLE.ADMIN:
      result = await Admin.findOne({ authId: auth._id }).lean();
      break;
    default:
      result = await User.findOne({ authId: auth._id }).lean();
  }

  const tokenPayload = {
    authId: auth._id,
    userId: result._id,
    email,
    role: auth.role,
  };

  const accessToken = jwtHelpers.createToken(
    tokenPayload,
    config.jwt.secret,
    config.jwt.expires_in
  );
  const refreshToken = jwtHelpers.createToken(
    tokenPayload,
    config.jwt.refresh_secret,
    config.jwt.refresh_expires_in
  );

  return {
    accessToken,
    refreshToken,
  };
};

const loginAccount = async (payload) => {
  const { email, password } = payload;

  const auth = await Auth.isAuthExist(email);

  if (!auth) throw new ApiError(status.NOT_FOUND, "User does not exist");

  if (!auth.isActive)
    throw new ApiError(
      status.BAD_REQUEST,
      "Please activate your account then try to login"
    );

  if (auth.isBlocked)
    throw new ApiError(status.FORBIDDEN, "You are blocked. Contact support");

  if (
    auth.password &&
    !(await Auth.isPasswordMatched(password, auth.password))
  ) {
    throw new ApiError(status.BAD_REQUEST, "Password is incorrect");
  }

  let result;
  switch (auth.role) {
    case ENUM_USER_ROLE.ADMIN:
      result = await Admin.findOne({ authId: auth._id }).populate("authId");
      break;
    default:
      result = await User.findOne({ authId: auth._id }).populate("authId");
  }

  if (
    auth.role === ENUM_USER_ROLE.USER &&
    !result.isSubscribed &&
    result.trialExpires &&
    result.trialExpires < new Date()
  ) {
    throw new ApiError(
      status.FORBIDDEN,
      "Trial period expired. Please subscribe"
    );
  }

  if (auth.role === ENUM_USER_ROLE.USER && !result.firstLogin)
    await trialActivationForNewUser(auth._id);

  const tokenPayload = {
    authId: auth._id,
    userId: result._id,
    email,
    role: auth.role,
  };

  const accessToken = jwtHelpers.createToken(
    tokenPayload,
    config.jwt.secret,
    config.jwt.expires_in
  );

  const refreshToken = jwtHelpers.createToken(
    tokenPayload,
    config.jwt.refresh_secret,
    config.jwt.refresh_expires_in
  );

  return {
    accessToken,
    refreshToken,
  };
};

const forgotPass = async (payload) => {
  const { email } = payload;

  if (!email) throw new ApiError(status.BAD_REQUEST, "Missing email");

  const user = await Auth.isAuthExist(email);
  if (!user) throw new ApiError(status.BAD_REQUEST, "User not found!");

  const { code: verificationCode, expiredAt: verificationCodeExpire } =
    codeGenerator(3);

  user.verificationCode = verificationCode;
  user.verificationCodeExpire = verificationCodeExpire;
  await user.save();

  const data = {
    user: `${user.firstName} ${user.lastName}`,
    verificationCode,
    verificationCodeExpire: Math.round(
      (verificationCodeExpire - Date.now()) / (60 * 1000)
    ),
  };

  EmailHelpers.sendResetPasswordEmail(email, data);
};

const forgetPassOtpVerify = async (payload) => {
  const { email, code } = payload;

  if (!email) throw new ApiError(status.BAD_REQUEST, "Missing email");

  const auth = await Auth.findOne({ email: email });
  if (!auth) throw new ApiError(status.NOT_FOUND, "Account does not exist!");
  if (!auth.verificationCode)
    throw new ApiError(
      status.NOT_FOUND,
      "No verification code. Get a new verification code"
    );
  if (auth.verificationCode !== code)
    throw new ApiError(status.BAD_REQUEST, "Invalid verification code!");

  await Auth.updateOne(
    { email: auth.email },
    { isVerified: true, verificationCode: null }
  );
};

const resetPassword = async (payload) => {
  const { email, newPassword, confirmPassword } = payload;

  if (newPassword !== confirmPassword)
    throw new ApiError(status.BAD_REQUEST, "Passwords do not match");

  const auth = await Auth.isAuthExist(email);
  if (!auth) throw new ApiError(status.NOT_FOUND, "User not found!");
  if (!auth.isVerified)
    throw new ApiError(status.FORBIDDEN, "Please complete OTP verification");

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  await Auth.updateOne(
    { email },
    {
      $set: { password: hashedPassword },
      $unset: {
        isVerified: "",
        verificationCode: "",
        verificationCodeExpire: "",
      },
    }
  );
};

const changePassword = async (userData, payload) => {
  const { email } = userData;
  const { oldPassword, newPassword, confirmPassword } = payload;

  validateFields(payload, ["oldPassword", "newPassword", "confirmPassword"]);

  if (newPassword !== confirmPassword)
    throw new ApiError(
      status.BAD_REQUEST,
      "Password and confirm password do not match"
    );

  const isUserExist = await Auth.isAuthExist(email);

  if (!isUserExist)
    throw new ApiError(status.NOT_FOUND, "Account does not exist!");
  if (
    isUserExist.password &&
    !(await Auth.isPasswordMatched(oldPassword, isUserExist.password))
  ) {
    throw new ApiError(status.BAD_REQUEST, "Old password is incorrect");
  }

  isUserExist.password = newPassword;
  isUserExist.save();
};

// utility ===============================================

const updateFieldsWithCron = async (check) => {
  const now = new Date();
  let result;

  if (check === "activation") {
    result = await Auth.updateMany(
      {
        activationCodeExpire: { $lte: now },
      },
      {
        $unset: {
          activationCode: "",
          activationCodeExpire: "",
        },
      }
    );
  }

  if (check === "verification") {
    result = await Auth.updateMany(
      {
        verificationCodeExpire: { $lte: now },
      },
      {
        $unset: {
          isVerified: "",
          verificationCode: "",
          verificationCodeExpire: "",
        },
      }
    );
  }

  if (result.modifiedCount > 0)
    logger.info(
      `Removed ${result.modifiedCount} expired ${
        check === "activation" ? "activation" : "verification"
      } code`
    );
};

const trialActivationForNewUser = async (authId) => {
  const now = new Date();

  const updateUser = await User.findOneAndUpdate(
    { authId: authId },
    {
      firstLogin: now,
      trialExpires: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now,
    },
    { new: true, runValidators: true }
  );

  console.log(updateUser);
};

// Unset activationCode activationCodeExpire field for expired activation code
// Unset isVerified, verificationCode, verificationCodeExpire field for expired verification code
cron.schedule("* * * * *", async () => {
  try {
    updateFieldsWithCron("activation");
    updateFieldsWithCron("verification");
  } catch (error) {
    errorLogger.error("Error removing expired code:", error);
  }
});

const AuthService = {
  registrationAccount,
  loginAccount,
  changePassword,
  forgotPass,
  resetPassword,
  activateAccount,
  forgetPassOtpVerify,
  resendActivationCode,
};

module.exports = { AuthService };
