import { Order } from "../../../shared/models/order.model.js";
import mongoose from "mongoose";

/**
 * Get sales analytics for the authenticated cook
 * GET /api/cook/sales?period=daily|weekly|monthly|yearly
 */
export const getSalesAnalytics = async (req, res) => {
    try {
        const cookId = new mongoose.Types.ObjectId(req.user._id);
        const { period = "monthly" } = req.query;

        const now = new Date();
        let dateFilter = {};
        let groupId;
        let sortField;

        // Use a computed date field: deliveredAt if available, otherwise createdAt
        const dateExpr = { $ifNull: ["$deliveredAt", "$createdAt"] };

        switch (period) {
            case "daily": {
                const thirtyDaysAgo = new Date(now);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
                thirtyDaysAgo.setHours(0, 0, 0, 0);
                dateFilter = {
                    $or: [
                        { deliveredAt: { $gte: thirtyDaysAgo } },
                        { deliveredAt: null, createdAt: { $gte: thirtyDaysAgo } },
                    ],
                };
                groupId = {
                    year: { $year: dateExpr },
                    month: { $month: dateExpr },
                    day: { $dayOfMonth: dateExpr },
                };
                sortField = { "_id.year": 1, "_id.month": 1, "_id.day": 1 };
                break;
            }
            case "weekly": {
                const twelveWeeksAgo = new Date(now);
                twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 83);
                twelveWeeksAgo.setHours(0, 0, 0, 0);
                dateFilter = {
                    $or: [
                        { deliveredAt: { $gte: twelveWeeksAgo } },
                        { deliveredAt: null, createdAt: { $gte: twelveWeeksAgo } },
                    ],
                };
                groupId = {
                    year: { $isoWeekYear: dateExpr },
                    week: { $isoWeek: dateExpr },
                };
                sortField = { "_id.year": 1, "_id.week": 1 };
                break;
            }
            case "monthly": {
                const twelveMonthsAgo = new Date(now);
                twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
                twelveMonthsAgo.setDate(1);
                twelveMonthsAgo.setHours(0, 0, 0, 0);
                dateFilter = {
                    $or: [
                        { deliveredAt: { $gte: twelveMonthsAgo } },
                        { deliveredAt: null, createdAt: { $gte: twelveMonthsAgo } },
                    ],
                };
                groupId = {
                    year: { $year: dateExpr },
                    month: { $month: dateExpr },
                };
                sortField = { "_id.year": 1, "_id.month": 1 };
                break;
            }
            case "yearly": {
                groupId = {
                    year: { $year: dateExpr },
                };
                sortField = { "_id.year": 1 };
                break;
            }
            default:
                return res.status(400).json({ message: "Invalid period. Use daily, weekly, monthly, or yearly" });
        }

        const baseMatch = { cookId, status: "delivered" };
        const matchStage = period === "yearly"
            ? baseMatch
            : { ...baseMatch, ...dateFilter };

        // Aggregation for chart data
        const chartDataPipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: groupId,
                    orders: { $sum: 1 },
                    revenue: { $sum: "$totalAmount" },
                },
            },
            { $sort: sortField },
        ];

        // Aggregation for top selling meals
        const topMealsPipeline = [
            { $match: matchStage },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.name",
                    quantity: { $sum: "$items.quantity" },
                    revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                },
            },
            { $sort: { quantity: -1 } },
            { $limit: 5 },
            {
                $project: {
                    _id: 0,
                    name: "$_id",
                    quantity: 1,
                    revenue: { $round: ["$revenue", 0] },
                },
            },
        ];

        // Summary aggregation
        const summaryPipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" },
                    totalOrders: { $sum: 1 },
                    averageOrderValue: { $avg: "$totalAmount" },
                },
            },
        ];

        const [chartRaw, topMeals, summaryRaw] = await Promise.all([
            Order.aggregate(chartDataPipeline),
            Order.aggregate(topMealsPipeline),
            Order.aggregate(summaryPipeline),
        ]);

        // Format chart data labels
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const chartData = chartRaw.map((item) => {
            let label;
            if (period === "daily") {
                label = `${item._id.day}/${item._id.month}`;
            } else if (period === "weekly") {
                label = `W${item._id.week}`;
            } else if (period === "monthly") {
                label = `${monthNames[item._id.month - 1]} ${item._id.year}`;
            } else {
                label = `${item._id.year}`;
            }

            return {
                label,
                orders: item.orders,
                revenue: Math.round(item.revenue),
            };
        });

        const summary = summaryRaw.length > 0
            ? {
                totalRevenue: Math.round(summaryRaw[0].totalRevenue),
                totalOrders: summaryRaw[0].totalOrders,
                averageOrderValue: Math.round(summaryRaw[0].averageOrderValue),
            }
            : { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 };

        return res.status(200).json({
            chartData,
            topMeals,
            summary,
            period,
        });
    } catch (error) {
        console.error("Get sales analytics error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
