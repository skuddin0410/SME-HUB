import { ActiveMembersCard, GroupsCard, TwoCol } from "@/components/rails";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <TwoCol
      aside={
        <>
          <GroupsCard />
          <ActiveMembersCard />
        </>
      }
    >
      {children}
    </TwoCol>
  );
}
