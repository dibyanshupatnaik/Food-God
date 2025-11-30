import { pythonApiFetch } from "@/app/api/utils/pythonClient";

export async function GET() {
  try {
    const { data } = await pythonApiFetch("/nutrition/progress");
    return Response.json(data);
  } catch (error) {
    console.error("Error fetching nutrition progress:", error);
    return Response.json(
      { error: "Failed to fetch nutrition progress" },
      { status: 500 },
    );
  }
}

