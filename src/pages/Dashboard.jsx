export default function Dashboard() {
  return (
    <>
      <h1>Dashboard</h1>

      <div className="cards">

        <div className="card">
          <h3>Customers</h3>
          <span>0</span>
        </div>

        <div className="card">
          <h3>Carrier Lookups</h3>
          <span>0</span>
        </div>

        <div className="card">
          <h3>Sales Opportunities</h3>
          <span>0</span>
        </div>

      </div>
    </>
  );
}