import { RoomDetailPage } from "@/features/rooms/RoomDetailPage";

export default function RoomDetail({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  return <RoomDetailPage params={params} />;
}
