import { redirect } from "next/navigation";
import { getAuthToken } from "@/lib/auth";
import { StandardDisplay } from "@/components/display/standard-display";

export default async function Page() {
    const token = await getAuthToken();
    if (!token) redirect("/?error=session_expired");

    return <StandardDisplay requireTable={process.env.REQUIRE_TABLE === "true"} />;
}
