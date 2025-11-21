/**
 * Dashboard/Home page - Galaxy background with constellation routes.
 */

import Constellation from "../components/Constellation";
import "./Dashboard.css";

function Dashboard() {
  return (
    <div className="dashboard-page" aria-label="CurioCodex star map">
      <Constellation />
    </div>
  );
}

export default Dashboard;

