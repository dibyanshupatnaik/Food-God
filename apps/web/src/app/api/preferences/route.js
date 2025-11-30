import { pythonApiFetch } from "@/app/api/utils/pythonClient";

export async function GET() {
  try {
    const { data } = await pythonApiFetch("/preferences");
    return Response.json(data);
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return Response.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const { data } = await pythonApiFetch("/preferences", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return Response.json(data);
  } catch (error) {
    console.error("Error saving preferences:", error);
    return Response.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const payload = await request.json();
    const { data } = await pythonApiFetch("/preferences", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return Response.json(data);
  } catch (error) {
    console.error("Error updating preferences:", error);
    return Response.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}

