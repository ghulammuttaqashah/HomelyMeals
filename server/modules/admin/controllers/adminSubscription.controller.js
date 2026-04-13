import mongoose from "mongoose";
import { Plan } from "../../../shared/models/plan.model.js";
import { Subscription } from "../../../shared/models/subscription.model.js";
import { Cook } from "../../cook/models/cook.model.js";

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isDuplicateNameError = (error) =>
  error?.code === 11000 &&
  (error?.keyPattern?.name === 1 || String(error?.message || "").includes("index: name_1"));

/**
 * POST /api/admin/plans
 */
export const createPlan = async (req, res) => {
  try {
    const { name, price, duration } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Plan name is required" });
    }

    const priceNum = Number(price);
    const durationNum = Number(duration);

    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return res.status(400).json({ message: "Price must be greater than 0" });
    }

    if (!Number.isInteger(durationNum) || durationNum <= 0) {
      return res.status(400).json({ message: "Duration must be a positive integer (days)" });
    }

    const normalizedName = String(name).trim();
    const existing = await Plan.findOne({
      name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: "i" },
    });
    if (existing) {
      return res.status(400).json({ message: "Plan name already exists" });
    }

    const plan = await Plan.create({
      name: normalizedName,
      price: priceNum,
      duration: durationNum,
      status: "active",
    });

    return res.status(201).json({
      message: "Plan created successfully",
      plan,
    });
  } catch (error) {
    if (isDuplicateNameError(error)) {
      return res.status(400).json({ message: "Plan name already exists" });
    }
    console.error("Create plan error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * PUT /api/admin/plans/:id
 */
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, duration, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid plan ID" });
    }

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    if (name !== undefined) {
      const normalizedName = String(name).trim();
      if (!normalizedName) {
        return res.status(400).json({ message: "Plan name cannot be empty" });
      }

      if (normalizedName !== plan.name) {
        const duplicate = await Plan.findOne({
          name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: "i" },
          _id: { $ne: plan._id },
        });
        if (duplicate) {
          return res.status(400).json({ message: "Plan name already exists" });
        }
      }

      plan.name = normalizedName;
    }

    if (price !== undefined) {
      const priceNum = Number(price);
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        return res.status(400).json({ message: "Price must be greater than 0" });
      }
      plan.price = priceNum;
    }

    if (duration !== undefined) {
      const durationNum = Number(duration);
      if (!Number.isInteger(durationNum) || durationNum <= 0) {
        return res.status(400).json({ message: "Duration must be a positive integer (days)" });
      }
      plan.duration = durationNum;
    }

    if (status !== undefined) {
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({ message: "Invalid plan status" });
      }
      plan.status = status;
    }

    await plan.save();

    return res.status(200).json({
      message: "Plan updated successfully",
      plan,
    });
  } catch (error) {
    if (isDuplicateNameError(error)) {
      return res.status(400).json({ message: "Plan name already exists" });
    }
    console.error("Update plan error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE /api/admin/plans/:id
 */
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid plan ID" });
    }

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const linkedSubscriptions = await Subscription.countDocuments({
      plan_id: id,
      status: { $in: ["active", "pending"] },
    });

    if (linkedSubscriptions > 0) {
      return res.status(400).json({
        message: "Cannot delete plan with active or pending subscriptions",
      });
    }

    await Plan.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Plan deleted successfully",
    });
  } catch (error) {
    console.error("Delete plan error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/admin/plans
 */
export const getPlans = async (req, res) => {
  try {
    const { status, search } = req.query;

    const query = {};
    if (status && ["active", "inactive"].includes(status)) {
      query.status = status;
    }

    if (search && String(search).trim()) {
      query.name = { $regex: String(search).trim(), $options: "i" };
    }

    const plans = await Plan.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      plans,
    });
  } catch (error) {
    console.error("Get plans error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/admin/subscriptions
 */
export const getSubscriptions = async (req, res) => {
  try {
    const { plan, status, search, page = 1, limit = 20 } = req.query;

    await Subscription.updateMany(
      {
        status: "active",
        end_date: { $lt: new Date() },
      },
      {
        $set: { status: "expired" },
      }
    );

    const query = {};

    if (plan && mongoose.Types.ObjectId.isValid(plan)) {
      query.plan_id = plan;
    }

    if (status && ["active", "expired", "pending"].includes(status)) {
      query.status = status;
    }

    if (search && String(search).trim()) {
      const searchValue = String(search).trim();
      const cookQuery = {
        $or: [{ name: { $regex: searchValue, $options: "i" } }],
      };

      if (mongoose.Types.ObjectId.isValid(searchValue)) {
        cookQuery.$or.push({ _id: searchValue });
      }

      const cooks = await Cook.find(cookQuery).select("_id");
      const cookIds = cooks.map((cook) => cook._id);

      if (!cookIds.length) {
        return res.status(200).json({
          subscriptions: [],
          pagination: {
            total: 0,
            page: parseInt(page, 10),
            pages: 0,
          },
        });
      }

      query.cook_id = { $in: cookIds };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const baseQuery = Subscription.find(query)
      .populate("cook_id", "name")
      .populate("plan_id", "name price duration")
      .sort({ createdAt: -1 });

    const subscriptions = await baseQuery.skip(skip).limit(parseInt(limit, 10));

    const total = await Subscription.countDocuments(query);

    return res.status(200).json({
      subscriptions: subscriptions.map((item) => ({
        _id: item._id,
        cook: item.cook_id
          ? { _id: item.cook_id._id, name: item.cook_id.name }
          : null,
        plan: item.plan_id
          ? {
              _id: item.plan_id._id,
              name: item.plan_id.name,
              price: item.plan_id.price,
              duration: item.plan_id.duration,
            }
          : null,
        status: item.status,
        start_date: item.start_date,
        end_date: item.end_date,
        stripe_payment_intent_id: item.stripe_payment_intent_id,
        createdAt: item.createdAt,
      })),
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    console.error("Get subscriptions error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/admin/subscriptions/revenue
 */
export const getSubscriptionRevenue = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const revenueStatuses = ["active", "expired"];

    const baseMatch = {
      status: { $in: revenueStatuses },
      start_date: { $ne: null },
    };

    const [totals, todayTotals, monthTotals, perPlan] = await Promise.all([
      Subscription.aggregate([
        { $match: baseMatch },
        {
          $lookup: {
            from: "plans",
            localField: "plan_id",
            foreignField: "_id",
            as: "plan",
          },
        },
        { $unwind: "$plan" },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$plan.price" },
            totalSubscriptions: { $sum: 1 },
          },
        },
      ]),
      Subscription.aggregate([
        {
          $match: {
            ...baseMatch,
            start_date: { $gte: startOfToday },
          },
        },
        {
          $lookup: {
            from: "plans",
            localField: "plan_id",
            foreignField: "_id",
            as: "plan",
          },
        },
        { $unwind: "$plan" },
        {
          $group: {
            _id: null,
            todayRevenue: { $sum: "$plan.price" },
            todaySubscriptions: { $sum: 1 },
          },
        },
      ]),
      Subscription.aggregate([
        {
          $match: {
            ...baseMatch,
            start_date: { $gte: startOfMonth },
          },
        },
        {
          $lookup: {
            from: "plans",
            localField: "plan_id",
            foreignField: "_id",
            as: "plan",
          },
        },
        { $unwind: "$plan" },
        {
          $group: {
            _id: null,
            monthRevenue: { $sum: "$plan.price" },
            monthSubscriptions: { $sum: 1 },
          },
        },
      ]),
      Subscription.aggregate([
        { $match: baseMatch },
        {
          $lookup: {
            from: "plans",
            localField: "plan_id",
            foreignField: "_id",
            as: "plan",
          },
        },
        { $unwind: "$plan" },
        {
          $group: {
            _id: "$plan_id",
            planName: { $first: "$plan.name" },
            planPrice: { $first: "$plan.price" },
            subscriptions: { $sum: 1 },
            revenue: { $sum: "$plan.price" },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
    ]);

    const totalRow = totals[0] || { totalRevenue: 0, totalSubscriptions: 0 };
    const todayRow = todayTotals[0] || { todayRevenue: 0, todaySubscriptions: 0 };
    const monthRow = monthTotals[0] || { monthRevenue: 0, monthSubscriptions: 0 };

    return res.status(200).json({
      summary: {
        totalRevenue: totalRow.totalRevenue || 0,
        totalSubscriptions: totalRow.totalSubscriptions || 0,
        todayRevenue: todayRow.todayRevenue || 0,
        todaySubscriptions: todayRow.todaySubscriptions || 0,
        monthRevenue: monthRow.monthRevenue || 0,
        monthSubscriptions: monthRow.monthSubscriptions || 0,
      },
      perPlan: perPlan.map((row) => ({
        planId: row._id,
        planName: row.planName,
        planPrice: row.planPrice,
        subscriptions: row.subscriptions,
        revenue: row.revenue,
      })),
    });
  } catch (error) {
    console.error("Get subscription revenue error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
