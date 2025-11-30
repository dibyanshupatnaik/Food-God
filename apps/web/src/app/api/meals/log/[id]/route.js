import { pythonApiFetch } from "@/app/api/utils/pythonClient";

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { data } = await pythonApiFetch(`/meals/log/${id}`);
    return Response.json(data);
  } catch (error) {
    console.error("Error fetching meal detail:", error);
    return Response.json({ error: "Failed to fetch meal detail" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const payload = await request.json();
    const { id } = params;
    const { data } = await pythonApiFetch(`/meals/log/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return Response.json(data);
  } catch (error) {
    console.error("Error updating meal detail:", error);
    return Response.json(
      { error: "Failed to update meal detail" },
      { status: 500 },
    );
  }
}

