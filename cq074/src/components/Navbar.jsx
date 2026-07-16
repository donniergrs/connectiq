import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function Navbar() {
  return (
    <header className="navbar sprint9-navbar">
      <div>
        <h2>Advisor Command Center</h2>
        <small>Pipeline, provider intelligence, and customer recommendations</small>
      </div>

      <button onClick={() => signOut(auth)}>Logout</button>
    </header>
  );
}
