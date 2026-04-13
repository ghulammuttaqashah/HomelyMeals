const KeywordTags = ({ data }) => {
    if (!data || !data.keywords || data.keywords.length === 0) return null

    return (
        <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Top Keywords</h3>
            <div className="flex flex-wrap gap-2">
                {data.keywords.slice(0, 15).map((keyword, index) => (
                    <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                        {keyword.word} ({keyword.count})
                    </span>
                ))}
            </div>
        </div>
    )
}

export default KeywordTags
