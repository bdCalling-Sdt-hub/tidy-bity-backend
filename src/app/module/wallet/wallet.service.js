const { default: status } = require("http-status");
const validateFields = require("../../../util/validateFields");
const dateTimeValidator = require("../../../util/dateTimeValidator");
const Budget = require("./Budget");
const ApiError = require("../../../error/ApiError");
const Expense = require("./Expense");
const postNotification = require("../../../util/postNotification");
const QueryBuilder = require("../../../builder/queryBuilder");

const postBudget = async (req) => {
  const { body: payload, files, user } = req;

  validateFields(files, ["budgetImage"]);
  validateFields(payload, ["category", "budgetDateStr", "currency", "amount"]);
  dateTimeValidator(payload.budgetDateStr);

  const budgetData = {
    user: user.userId,
    category: payload.category,
    budgetImage: files.budgetImage[0].path,
    budgetDateStr: payload.budgetDateStr,
    currency: payload.currency,
    amount: Math.round(payload.amount),
    currentExpense: payload.currentExpense,
    expenses: payload.expenses,
  };

  const budget = await Budget.create(budgetData);

  return budget;
};

const getBudget = async (userData, query) => {
  validateFields(query, ["budgetId"]);

  const budget = await Budget.findById(query.budgetId)
    .populate([
      {
        path: "expenses",
      },
    ])
    .lean();

  if (!budget) throw new ApiError(status.NOT_FOUND, "Budget not found");

  return budget;
};

const getMyBudget = async (userData, query) => {
  const budgetQuery = new QueryBuilder(
    Budget.find({ user: userData.userId }),
    query
  )
    .search([])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([
    budgetQuery.modelQuery,
    budgetQuery.countTotal(),
  ]);

  return {
    meta,
    result,
  };
};

const getAllBudget = async (userData, query) => {
  const budgetQuery = new QueryBuilder(Budget.find({}), query)
    .search([])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [result, meta] = await Promise.all([
    budgetQuery.modelQuery,
    budgetQuery.countTotal(),
  ]);

  return {
    meta,
    result,
  };
};

const updateBudget = async (userData, payload) => {
  validateFields(payload, ["budgetId"]);

  const updateData = {
    ...(payload.category && { category: payload.category }),
    ...(payload.currency && { currency: payload.currency }),
    ...(payload.amount && { amount: payload.amount }),
  };

  const updatedBudget = await Budget.findByIdAndUpdate(
    payload.budgetId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!updatedBudget) throw new ApiError(status.NOT_FOUND, "Budget not found");

  return updatedBudget;
};

const deleteBudget = async (userData, payload) => {
  validateFields(payload, ["budgetId"]);

  const deletedBudget = await Budget.deleteOne({ _id: payload.budgetId });

  if (!deletedBudget.deletedCount)
    throw new ApiError(status.NOT_FOUND, "Budget not found");

  const deletedExpenses = await Expense.deleteMany({
    budget: payload.budgetId,
  });

  return deletedBudget;
};

// Expense  =======================================================

const postExpense = async (userData, payload) => {
  validateFields(payload, ["budgetId", "expenseDateStr", "amount"]);
  dateTimeValidator(payload.expenseDateStr);

  const budget = await Budget.findById(payload.budgetId).lean();

  if (!budget) throw new ApiError(status.NOT_FOUND, "Budget not found");

  const expenseData = {
    user: userData.userId,
    budget: payload.budgetId,
    expenseDateStr: payload.expenseDateStr,
    amount: Math.round(payload.amount),
  };

  const expense = await Expense.create(expenseData);

  Promise.all([
    Budget.findByIdAndUpdate(payload.budgetId, {
      $push: { expenses: expense._id },
      $inc: { currentExpense: expense.amount },
    }),
  ]);

  postNotification(
    "New expense",
    "New expense added to the budget",
    userData.userId
  );

  return expense;
};

const getExpense = async (userData, query) => {
  validateFields(query, ["expenseId"]);

  const expense = await Expense.findById(query.expenseId).lean();

  if (!expense) throw new ApiError(status.NOT_FOUND, "Expense not found");

  return expense;
};

const getSingleBudgetExpense = async (userData, query) => {};

const deleteExpense = async (userData, payload) => {
  validateFields(payload, ["expenseId"]);

  const expense = await Expense.findById(payload.expenseId).lean();

  if (!expense) throw new ApiError(status.NOT_FOUND, "Expense not found");

  Promise.all([
    Budget.findByIdAndUpdate(expense.budget, {
      $pull: { expenses: expense._id },
      $inc: { currentExpense: -expense.amount },
    }),
  ]);

  const result = await Expense.deleteOne({ _id: payload.expenseId });

  postNotification(
    "Deleted expense",
    "Expense has been deleted",
    userData.userId
  );

  return result;
};

const WalletService = {
  postBudget,
  getBudget,
  getMyBudget,
  getAllBudget,
  updateBudget,
  deleteBudget,
  postExpense,
  getExpense,
  getSingleBudgetExpense,
  deleteExpense,
};

module.exports = WalletService;
