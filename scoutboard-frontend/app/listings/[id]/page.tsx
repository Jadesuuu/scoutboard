import ListingDetail from "../../../components/listing/listing-detail";

export default async function ListingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;
  return <ListingDetail id={id} />;
}
