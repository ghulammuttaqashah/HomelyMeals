import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const COLORS = {
    Positive: '#10b981',
    Negative: '#ef4444',
    Neutral: '#6b7280'
}

const SentimentPieChart = ({ data }) => {
    if (!data || !data.overall) return null

    const { positive, negative, neutral } = data.overall
    const total = positive + negative + neutral

    if (total === 0) return null

    const chartData = [
        { name: 'Positive', value: positive, color: COLORS.Positive },
        { name: 'Negative', value: negative, color: COLORS.Negative },
        { name: 'Neutral', value: neutral, color: COLORS.Neutral }
    ].filter(item => item.value > 0)

    return (
        <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Overall Sentiment</h3>
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}

export default SentimentPieChart
