import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = {
    Positive: '#10b981',
    Negative: '#ef4444',
    Neutral: '#6b7280'
}

const AspectBarChart = ({ data }) => {
    if (!data || !data.aspects || data.aspects.length === 0) return null

    const chartData = data.aspects.slice(0, 8).map(aspect => ({
        name: aspect.name,
        Positive: aspect.positive,
        Negative: aspect.negative,
        Neutral: aspect.neutral
    }))

    return (
        <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Aspect Analysis</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Positive" fill={COLORS.Positive} />
                    <Bar dataKey="Negative" fill={COLORS.Negative} />
                    <Bar dataKey="Neutral" fill={COLORS.Neutral} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

export default AspectBarChart
