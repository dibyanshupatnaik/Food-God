import { pythonApiFetch } from "@/app/api/utils/pythonClient";

export async function POST(request) {
  try {
    const payload = await request.json();
    const { data } = await pythonApiFetch("/meals/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return Response.json(data);
  } catch (error) {
    console.error("Error generating meals via Python backend:", error);
    return Response.json(
      { error: "Failed to generate meal suggestions" },
      { status: 500 },
    );
  }
}

