import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function Navbar() {
  return (
    <header className="navbar">

      <div>

        <h2>ConnectIQ</h2>

        <small>Carrier Intelligence Platform</small>

      </div>

      <button onClick={() => signOut(auth)}>

        Logout

      </button>

    </header>
  );
}