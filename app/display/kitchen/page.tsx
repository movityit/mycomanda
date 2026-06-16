import { redirect } from "next/navigation";
import { getAuthToken } from "@/lib/auth";
import { DisplayPage } from "@/components/display/display-page";

export default async function Page() {
    const token = await getAuthToken();
    if (!token) redirect("/?error=session_expired");

    return <DisplayPage />;
}
