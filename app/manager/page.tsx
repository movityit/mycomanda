import { redirect } from "next/navigation";
import { getAuthToken } from "@/lib/auth";
import Manager from "@/components/manager/manager";

export default async function Page() {
    const token = await getAuthToken();
    if (!token) redirect("/?error=session_expired");

    return <Manager />;
}
