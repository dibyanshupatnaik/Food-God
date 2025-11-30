import { pythonApiFetch } from "@/app/api/utils/pythonClient";

export async function POST(request) {
  try {
    const payload = await request.json();
    const { data } = await pythonApiFetch("/meals/manual", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return Response.json(data);
  } catch (error) {
    console.error("Error logging manual meal via Python backend:", error);
    return Response.json(
      { error: "Failed to log manual meal" },
      { status: 500 },
    );
  }
}

