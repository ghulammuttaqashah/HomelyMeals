import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";

export default function DocumentUploadPage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("pending");

  const handleUpload = () => {
    if (!file) return alert("Please select a file first!");

    alert("Document uploaded successfully. Admin will verify it soon.");
    setStatus("submitted");
  };

  return (
    <div className="flex justify-center mt-10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Document Verification</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p>
            Status: <span className="font-semibold">{status}</span>
          </p>

          <input
            type="file"
            className="border p-2 w-full"
            onChange={(e) => setFile(e.target.files[0])}
          />

          <Button onClick={handleUpload} className="w-full bg-blue-600">
            Upload Document
          </Button>

          <p className="text-sm text-gray-500 mt-3">
            After admin approval, your cook account will be activated.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
