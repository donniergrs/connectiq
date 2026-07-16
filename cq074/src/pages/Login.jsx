import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);

      navigate("/");
    } catch (error) {
    console.error(error);
    setError(error.message);
}
  }

  return (
    <div className="login">

      <form className="login-card" onSubmit={handleSubmit}>

        <h1>ConnectIQ</h1>

        <p>Sign in to continue</p>

        {error && <div className="error">{error}</div>}

        <label>Email</label>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label>Password</label>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">

          Sign In

        </button>

      </form>

    </div>
  );
}