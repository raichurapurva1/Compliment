"use client";

import { useActionState, useState } from "react";
import { signIn, signInWithProvider, signUp, type ActionResult } from "../actions";

export function LoginForm(props: {
  initialMode: "signin" | "signup";
  initialError?: string;
  linkedin: boolean;
  google: boolean;
}) {
  const [mode, setMode] = useState(props.initialMode);
  const [signInState, signInAction, signingIn] = useActionState<ActionResult | null, FormData>(signIn, null);
  const [signUpState, signUpAction, signingUp] = useActionState<ActionResult | null, FormData>(signUp, null);
  const state = mode === "signin" ? signInState : signUpState;
  const pending = signingIn || signingUp;

  return (
    <div className="card p-6">
      <h1 className="text-xl font-semibold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-1 text-sm text-muted">
        {mode === "signin" ? "Sign in to see your leads." : "It takes about five minutes to set up your profile."}
      </p>

      {(props.linkedin || props.google) && (
        <div className="mt-5 space-y-2">
          {props.linkedin && (
            <button onClick={() => signInWithProvider("linkedin_oidc")} className="btn-secondary w-full">
              Continue with LinkedIn
            </button>
          )}
          {props.google && (
            <button onClick={() => signInWithProvider("google")} className="btn-secondary w-full">
              Continue with Google
            </button>
          )}
          <div className="py-2 text-center text-xs text-muted">or use email</div>
        </div>
      )}

      <form action={mode === "signin" ? signInAction : signUpAction} className="mt-5 space-y-4">
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" name="name" required className="field" autoComplete="name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="field" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="field"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
          {mode === "signup" && <p className="hint">At least 8 characters.</p>}
        </div>

        {(state && !state.ok) || (!state && props.initialError) ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state && !state.ok ? state.error : props.initialError}
          </p>
        ) : null}
        {state?.ok && state.message && (
          <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">{state.message}</p>
        )}

        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {mode === "signin" ? "New here? " : "Already have an account? "}
        <button
          type="button"
          className="font-medium text-accent hover:underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
      {!props.linkedin && !props.google && (
        <p className="mt-3 text-center text-xs text-muted">LinkedIn and Google sign-in are coming soon.</p>
      )}
    </div>
  );
}
