export default function Loading() {
  return (
    <>
      <div className="panel p-4">
        <div className="flex gap-3">
          <div className="skeleton h-11 w-11 !rounded-full" />
          <div className="skeleton h-11 flex-1 !rounded-2xl" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="panel space-y-4 p-4">
          <div className="flex items-center gap-3">
            <div className="skeleton h-11 w-11 !rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 w-40" />
              <div className="skeleton h-3 w-24" />
            </div>
          </div>
          <div className="skeleton h-3.5 w-full" />
          <div className="skeleton h-3.5 w-4/5" />
        </div>
      ))}
    </>
  );
}
