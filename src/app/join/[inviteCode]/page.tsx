import { JoinRoomPage } from "@/features/onboarding/JoinRoomPage";

export default function JoinRoom({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  return <JoinRoomPage params={params} />;
}
