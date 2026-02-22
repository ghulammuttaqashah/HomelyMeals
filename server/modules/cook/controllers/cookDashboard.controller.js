import { Order } from "../../../shared/models/order.model.js";
import Review from "../../../shared/models/review.model.js";
import { Chat } from "../../../shared/models/chat.model.js";
import CookMeal from "../models/cookMeal.model.js";
import mongoose from "mongoose";

/**
 * Get dashboard stats for the authenticated cook
 * GET /api/cook/dashboard/stats
 */
export const getDashboardStats = async (req, res) => {
    try {
        const cookId = new mongoose.Types.ObjectId(req.user._id);

        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Run all queries in parallel
        const [
            activeOrders,
            totalDelivered,
            todaysOrders,
            todayRevenue,
            monthRevenue,
            reviewStats,
            recentReviewCount,
            unreadChats,
            totalMeals,
            availableMeals,
        ] = await Promise.all([
            // Active orders count
            Order.countDocuments({
                cookId,
                status: { $in: ["confirmed", "preparing", "out_for_delivery"] },
            }),

            // Total delivered orders
            Order.countDocuments({ cookId, status: "delivered" }),

            // Today's orders count
            Order.countDocuments({
                cookId,
                createdAt: { $gte: startOfToday, $lte: endOfToday },
            }),

            // Today's revenue (check both deliveredAt and createdAt)
            Order.aggregate([
                {
                    $match: {
                        cookId,
                        status: "delivered",
                        $or: [
                            { deliveredAt: { $gte: startOfToday, $lte: endOfToday } },
                            { deliveredAt: null, createdAt: { $gte: startOfToday, $lte: endOfToday } },
                        ],
                    },
                },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ]),

            // This month's revenue (check both deliveredAt and createdAt)
            Order.aggregate([
                {
                    $match: {
                        cookId,
                        status: "delivered",
                        $or: [
                            { deliveredAt: { $gte: startOfMonth } },
                            { deliveredAt: null, createdAt: { $gte: startOfMonth } },
                        ],
                    },
                },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ]),

            // Review stats (average + total)
            Review.aggregate([
                { $match: { cookId } },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: "$rating" },
                        totalReviews: { $sum: 1 },
                    },
                },
            ]),

            // Recent reviews (last 7 days)
            Review.countDocuments({
                cookId,
                createdAt: { $gte: sevenDaysAgo },
            }),

            // Unread chat messages
            Chat.aggregate([
                { $match: { cookId, cookUnread: { $gt: 0 } } },
                { $group: { _id: null, total: { $sum: "$cookUnread" } } },
            ]),

            // Total meals
            CookMeal.countDocuments({ cookId }),

            // Available meals
            CookMeal.countDocuments({ cookId, availability: "Available" }),
        ]);

        return res.status(200).json({
            orders: {
                active: activeOrders,
                totalDelivered,
                today: todaysOrders,
            },
            revenue: {
                today: todayRevenue[0]?.total || 0,
                thisMonth: monthRevenue[0]?.total || 0,
            },
            reviews: {
                averageRating: reviewStats[0]
                    ? Math.round(reviewStats[0].averageRating * 10) / 10
                    : 0,
                totalReviews: reviewStats[0]?.totalReviews || 0,
                recentCount: recentReviewCount,
            },
            chats: {
                unread: unreadChats[0]?.total || 0,
            },
            menu: {
                total: totalMeals,
                available: availableMeals,
            },
        });
    } catch (error) {
        console.error("Get dashboard stats error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
