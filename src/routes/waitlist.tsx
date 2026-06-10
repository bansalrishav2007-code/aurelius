import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";

import { motion, AnimatePresence } from "framer-motion";

import { useCallback, useEffect, useState } from "react";

import { ArrowLeft, ArrowRight, Check, ExternalLink, Loader2, Mail, Send } from "lucide-react";

import { Logo } from "@/components/Logo";

import { ImmersiveScene } from "@/components/immersive";

import { PremiumFooter } from "@/components/PremiumFooter";

import { OtpDigitInput } from "@/components/waitlist/OtpDigitInput";

import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/components/ContactChannels";

import {

  resendWaitlistOtp,

  sendWaitlistOtp,

  submitWaitlist,

  verifyWaitlistOtp,

} from "@/lib/auth/client";

import { getAuthSession } from "@/lib/auth/session.functions";

import { getPostAuthPath } from "@/lib/auth/redirect-after-auth";

import { ApiError } from "@/lib/auth/client";

import { otpErrorMessage, type OtpErrorCode } from "@/lib/auth/otp.errors";



export const Route = createFileRoute("/waitlist")({

  beforeLoad: async () => {

    const session = await getAuthSession();

    if (session) throw redirect({ to: getPostAuthPath(session) });

  },

  head: () => ({ meta: [{ title: "Membership Application — Aurelius" }] }),

  component: WaitlistPage,

});



const professionOptions = [

  "Founder / Promoter",

  "Business Owner",

  "HNI Individual",

  "Family Office",

  "Senior Executive",

  "Other",

] as const;



const wealthNatureOptions = [

  "Business / Equity",

  "Investments / Portfolio",

  "Inheritance / Family wealth",

  "Multiple sources",

  "Other",

] as const;



const wealthConcernOptions = [

  "Tax optimisation",

  "Legal structuring",

  "Succession planning",

  "Investment management",

  "Asset protection",

  "Privacy and discretion",

  "All of the above",

] as const;



const hearAboutOptions = [

  "Instagram",

  "LinkedIn",

  "Referral from a member",

  "Google search",

  "Word of mouth",

  "Other",

] as const;



type Step = "identity" | "verify" | "application" | "done";

type NoticeKind = "error" | "warning" | "info";



const WAITLIST_STORAGE_KEY = "aurelius_waitlist_draft";



const defaultForm = {

  fullName: "",

  email: "",

  phone: "",

  company: "",

  profession: "",

  wealthNature: "",

  wealthConcern: "",

  city: "",

  hasCA: "" as "" | "yes" | "no",

  hasLawyer: "" as "" | "yes" | "no",

  applicationNote: "",

  hearAbout: "",

};



function loadWaitlistDraft(): {

  step?: Step;

  form?: typeof defaultForm;

  otpExpiresAt?: string | null;

} | null {

  if (typeof sessionStorage === "undefined") return null;

  try {

    const raw = sessionStorage.getItem(WAITLIST_STORAGE_KEY);

    return raw ? (JSON.parse(raw) as ReturnType<typeof loadWaitlistDraft>) : null;

  } catch {

    return null;

  }

}



function formatExpiryCountdown(expiresAt: string | null): string {

  if (!expiresAt) return "10:00";

  const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));

  const mins = Math.floor(remaining / 60);

  const secs = remaining % 60;

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

}



function WaitlistPage() {

  const navigate = useNavigate();

  const draft = loadWaitlistDraft();

  const [step, setStep] = useState<Step>(draft?.step ?? "identity");

  const [form, setForm] = useState({ ...defaultForm, ...draft?.form });

  const [otp, setOtp] = useState("");

  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [noticeKind, setNoticeKind] = useState<NoticeKind>("error");

  const [resendCooldown, setResendCooldown] = useState(0);

  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(draft?.otpExpiresAt ?? null);

  const [expiryLabel, setExpiryLabel] = useState(formatExpiryCountdown(draft?.otpExpiresAt ?? null));

  const [otpExpired, setOtpExpired] = useState(false);

  const [otpError, setOtpError] = useState(false);

  const [verifySuccess, setVerifySuccess] = useState(false);

  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  const [termsAccepted, setTermsAccepted] = useState(false);

  const [termsWarning, setTermsWarning] = useState(false);



  useEffect(() => {

    if (resendCooldown <= 0) return;

    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);

    return () => clearTimeout(t);

  }, [resendCooldown]);



  useEffect(() => {

    if (step !== "verify" || !otpExpiresAt) return;

    const tick = () => {

      const remaining = new Date(otpExpiresAt).getTime() - Date.now();

      if (remaining <= 0) {

        setOtpExpired(true);

        setExpiryLabel("00:00");

        return;

      }

      setOtpExpired(false);

      setExpiryLabel(formatExpiryCountdown(otpExpiresAt));

    };

    tick();

    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);

  }, [step, otpExpiresAt]);



  useEffect(() => {

    if (step === "done") {

      sessionStorage.removeItem(WAITLIST_STORAGE_KEY);

      return;

    }

    sessionStorage.setItem(

      WAITLIST_STORAGE_KEY,

      JSON.stringify({ step, form, otpExpiresAt }),

    );

  }, [step, form, otpExpiresAt]);



  function setNotice(message: string | null, kind: NoticeKind = "error") {

    setError(message);

    setNoticeKind(kind);

  }



  function formatApiError(err: unknown, fallback: string): string {

    if (err instanceof ApiError) {

      if (err.code) return otpErrorMessage(err.code as OtpErrorCode, err.message);

      return err.message;

    }

    if (err instanceof Error) return err.message;

    return fallback;

  }



  function handleRateLimit(err: unknown) {

    if (err instanceof ApiError && err.retryAfterSeconds) {

      setResendCooldown(err.retryAfterSeconds);

    }

  }



  function update(field: keyof typeof form, value: string) {

    setForm((f) => ({ ...f, [field]: value }));

  }



  async function handleSendOtp() {

    const email = form.email.trim().toLowerCase();

    if (!form.fullName.trim() || !email.includes("@")) {

      setNotice("Enter your full name and a valid email address.");

      return;

    }

    if (resendCooldown > 0) return;



    setLoading(true);

    setNotice(null);

    setOtp("");

    setOtpError(false);



    try {

      const result = await sendWaitlistOtp(email, form.fullName.trim());

      if (!result.sent) {

        setNotice("Unable to send verification email. Please try again.");

        return;

      }

      setForm((f) => ({ ...f, email }));

      setOtpExpiresAt(result.expiresAt);

      setOtpExpired(false);

      setStep("verify");

      setResendCooldown(60);

    } catch (err) {

      handleRateLimit(err);

      if (err instanceof ApiError && err.code === "EMAIL_ALREADY_REGISTERED") {

        setNotice(`${formatApiError(err, "")} Use the sign in page if you already have membership.`, "info");

      } else if (err instanceof ApiError && (err.code === "EMAIL_SEND_FAILED" || err.code === "EMAIL_NOT_CONFIGURED")) {

        setNotice("Unable to send verification email. Please try again.");

      } else {

        setNotice(formatApiError(err, "Unable to send verification email. Please try again."));

      }

    } finally {

      setLoading(false);

    }

  }



  async function handleResendOtp() {

    if (resendCooldown > 0) return;

    const email = form.email.trim().toLowerCase();

    setLoading(true);

    setNotice(null);

    setOtpError(false);

    setOtp("");

    try {

      const result = await resendWaitlistOtp(email, form.fullName.trim());

      if (!result.sent) {

        setNotice("Unable to send verification email. Please try again.");

        return;

      }

      setOtpExpiresAt(result.expiresAt);

      setOtpExpired(false);

      setResendCooldown(60);

    } catch (err) {

      handleRateLimit(err);

      if (err instanceof ApiError && (err.code === "EMAIL_SEND_FAILED" || err.code === "EMAIL_NOT_CONFIGURED")) {

        setNotice("Unable to send verification email. Please try again.");

      } else {

        setNotice(formatApiError(err, "Unable to send verification email. Please try again."));

      }

    } finally {

      setLoading(false);

    }

  }



  const runVerifyOtp = useCallback(

    async (code: string) => {

      if (loading || verifySuccess || code.length !== 6) return;

      const email = form.email.trim().toLowerCase();

      setLoading(true);

      setNotice(null);

      setOtpError(false);

      try {

        const result = await verifyWaitlistOtp(email, code);

        setVerificationToken(result.verificationToken);

        setVerifySuccess(true);

        setTimeout(() => {

          navigate({ to: "/dashboard" });

        }, 1200);

      } catch (err) {

        setOtpError(true);

        setNotice(formatApiError(err, "Verification failed."));

        setTimeout(() => setOtpError(false), 500);

      } finally {

        setLoading(false);

      }

    },

    [form.email, loading, verifySuccess, navigate],

  );



  async function handleVerifyOtp(e: React.FormEvent) {

    e.preventDefault();

    await runVerifyOtp(otp);

  }



  async function handleSubmitApplication(e: React.FormEvent) {

    e.preventDefault();

    if (!termsAccepted) {

      setTermsWarning(true);

      return;

    }

    if (!verificationToken) {

      setNotice("Email verification is required. Please complete the verification step.");

      setStep("verify");

      return;

    }

    if (!form.phone.trim()) {

      setNotice("Phone number is required to complete your application.");

      return;

    }

    setLoading(true);

    setNotice(null);

    try {

      const result = await submitWaitlist({

        fullName: form.fullName,

        email: form.email.trim().toLowerCase(),

        phone: form.phone,

        company: form.company || undefined,

        profession: form.profession,

        wealthNature: form.wealthNature,

        wealthConcern: form.wealthConcern,

        city: form.city,

        hasCA: form.hasCA === "yes" || form.hasCA === "no" ? form.hasCA : undefined,

        hasLawyer: form.hasLawyer === "yes" || form.hasLawyer === "no" ? form.hasLawyer : undefined,

        applicationNote: form.applicationNote || undefined,

        hearAbout: form.hearAbout || undefined,

        verificationToken,

      });

      setReferenceNumber(result.reference);

      setStep("done");

      sessionStorage.removeItem(WAITLIST_STORAGE_KEY);

    } catch (err) {

      setNotice(formatApiError(err, "Submission failed."));

    } finally {

      setLoading(false);

    }

  }



  return (

    <ImmersiveScene variant="auth" className="min-h-screen flex flex-col">

      <div className="flex-1 max-w-2xl mx-auto px-6 lg:px-10 py-12 lg:py-20 w-full">

        {step !== "done" && (

          <Link

            to="/"

            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-10 transition-colors"

          >

            <ArrowLeft className="h-3.5 w-3.5" /> Aurelius

          </Link>

        )}



        {step !== "done" && <Logo className="mb-10" />}

        {step !== "done" && <StepIndicator step={step} />}



        <AnimatePresence mode="wait">

          {step === "done" ? (

            <motion.div

              key="done"

              initial={{ opacity: 0 }}

              animate={{ opacity: 1 }}

              className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4"

            >

              <div className="relative mb-10">

                <div className="home-splash-glow absolute inset-0 -m-8 rounded-full" aria-hidden />

                <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-gold to-gold/70 grid place-items-center shadow-luxury">

                  <span className="font-display text-3xl font-bold text-background">A</span>

                </div>

              </div>

              <p className="label-caps mb-3">Application received</p>

              <h1 className="font-display text-4xl md:text-5xl tracking-tight mb-3">Application received.</h1>

              <p className="gold-text italic text-lg mb-4">We&apos;ll be in touch.</p>

              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-6">

                Your application has been submitted confidentially. Our private office team reviews applications

                quarterly. If your profile aligns, you will receive a personal invitation code by email.

              </p>

              <p className="text-xs text-muted-foreground mb-2">Typical review: 5–10 business days</p>

              {referenceNumber && (

                <p className="text-sm font-mono tracking-wider text-gold mb-10">

                  Reference: {referenceNumber}

                </p>

              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">

                <Link to="/" className="btn-primary h-12 flex-1 justify-center">

                  Return to Aurelius

                </Link>

                <a

                  href={INSTAGRAM_URL}

                  target="_blank"

                  rel="noopener noreferrer"

                  className="btn-secondary h-12 flex-1 justify-center gap-2"

                >

                  Follow on Instagram {INSTAGRAM_HANDLE}

                  <ExternalLink className="h-3.5 w-3.5" />

                </a>

              </div>

            </motion.div>

          ) : step === "identity" ? (

            <motion.div key="identity" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75 }}>

              <p className="label-caps mb-4">Step 1 · Identity</p>

              <h1 className="font-display text-4xl md:text-5xl tracking-tight text-balance leading-[1.05]">

                Apply for <span className="gold-text italic">membership.</span>

              </h1>

              <p className="mt-5 text-sm text-muted-foreground leading-relaxed">

                Enter your email to receive a 6-digit verification code from Aurelius. Once verified, you can complete your confidential application.

              </p>



              <div className="mt-10 space-y-5">

                <Field label="Full name" required>

                  <input

                    required

                    value={form.fullName}

                    onChange={(e) => update("fullName", e.target.value)}

                    className="field-input"

                    placeholder="Legal name"

                    autoComplete="name"

                  />

                </Field>

                <Field label="Email address" required>

                  <input

                    type="email"

                    required

                    value={form.email}

                    onChange={(e) => update("email", e.target.value)}

                    className="field-input"

                    placeholder="principal@office.com"

                    autoComplete="email"

                  />

                </Field>

                <div className="grid sm:grid-cols-2 gap-5">

                  <Field label="Phone number">

                    <input

                      type="tel"

                      value={form.phone}

                      onChange={(e) => update("phone", e.target.value)}

                      className="field-input"

                      placeholder="+91 · · · · · · · · · ·"

                      autoComplete="tel"

                    />

                  </Field>

                  <Field label="Company">

                    <input

                      value={form.company}

                      onChange={(e) => update("company", e.target.value)}

                      className="field-input"

                      placeholder="Optional"

                      autoComplete="organization"

                    />

                  </Field>

                </div>



                {error && <Notice message={error} kind={noticeKind} />}



                <button

                  type="button"

                  disabled={loading || resendCooldown > 0}

                  onClick={handleSendOtp}

                  className="btn-primary w-full h-12 shadow-luxury"

                >

                  {loading ? (

                    <>

                      <Loader2 className="h-4 w-4 animate-spin" /> Sending code…

                    </>

                  ) : resendCooldown > 0 ? (

                    `Resend in ${resendCooldown}s`

                  ) : (

                    <>

                      Continue — send verification code

                      <Mail className="h-4 w-4" strokeWidth={1.5} />

                    </>

                  )}

                </button>

              </div>

            </motion.div>

          ) : step === "verify" ? (

            <motion.div key="verify" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

              <p className="label-caps mb-4">Step 2 · Verify</p>

              <h1 className="font-display text-4xl md:text-5xl tracking-tight">Check your inbox.</h1>

              <p className="gold-text italic mt-3 text-lg">Your verification code has been sent.</p>

              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">

                We sent a 6-digit verification code to{" "}

                <span className="text-gold">{form.email}</span> from Aurelius. It expires in 10 minutes. Enter the code below to verify your email.

              </p>



              {verifySuccess ? (

                <motion.div

                  initial={{ scale: 0.8, opacity: 0 }}

                  animate={{ scale: 1, opacity: 1 }}

                  className="mt-12 flex flex-col items-center gap-4"

                >

                  <div className="h-16 w-16 rounded-full bg-success/15 border border-success/40 grid place-items-center">

                    <Check className="h-8 w-8 text-success" strokeWidth={2} />

                  </div>

                  <p className="text-sm text-success">Email verified</p>

                </motion.div>

              ) : (

                <form onSubmit={handleVerifyOtp} className="mt-10 space-y-6">

                  <OtpDigitInput

                    value={otp}

                    onChange={setOtp}

                    onComplete={runVerifyOtp}

                    disabled={loading || otpExpired}

                    error={otpError}

                    success={otp.length === 6 && !otpError && !error}

                  />



                  <div className="text-center text-xs text-muted-foreground">

                    {otpExpired ? (

                      <span className="text-destructive">Code expired. Request new code.</span>

                    ) : (

                      <>Code expires in <span className="text-foreground font-mono">{expiryLabel}</span></>

                    )}

                  </div>



                  {error && <Notice message={error} kind={noticeKind} />}



                  <button

                    type="submit"

                    disabled={loading || otp.length !== 6 || otpExpired}

                    className="btn-primary w-full h-12"

                  >

                    {loading ? (

                      <>

                        <Loader2 className="h-4 w-4 animate-spin" /> Verifying…

                      </>

                    ) : (

                      <>

                        Verify code

                        <ArrowRight className="h-4 w-4" />

                      </>

                    )}

                  </button>



                  <div className="flex items-center justify-between text-xs text-muted-foreground">

                    <button

                      type="button"

                      onClick={() => {

                        setStep("identity");

                        setOtp("");

                        setNotice(null);

                      }}

                      className="hover:text-foreground"

                    >

                      ← Change email

                    </button>

                    <button

                      type="button"

                      disabled={loading || resendCooldown > 0}

                      onClick={handleResendOtp}

                      className="hover:text-foreground disabled:opacity-50"

                    >

                      {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}

                    </button>

                  </div>

                </form>

              )}

            </motion.div>

          ) : (

            <motion.div key="application" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

              <p className="label-caps mb-4">Step 3 · Apply</p>

              <h1 className="font-display text-4xl md:text-5xl tracking-tight">Complete your application.</h1>

              <p className="gold-text italic mt-3 text-lg">Almost there.</p>

              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">

                Tell us about yourself. All information is handled with strict confidentiality.

              </p>

              <p className="mt-4 inline-flex items-center gap-2 text-sm text-success">

                <Check className="h-3.5 w-3.5" />

                <span className="text-gold">{form.email}</span>

                <span className="text-success">✓ Verified</span>

              </p>



              <form onSubmit={handleSubmitApplication} className="mt-10 space-y-5">

                <Field label="Profession" required>

                  <select

                    required

                    value={form.profession}

                    onChange={(e) => update("profession", e.target.value)}

                    className="field-input"

                  >

                    <option value="">Select profession</option>

                    {professionOptions.map((o) => (

                      <option key={o} value={o}>{o}</option>

                    ))}

                  </select>

                </Field>



                <Field label="Nature of wealth" required>

                  <select

                    required

                    value={form.wealthNature}

                    onChange={(e) => update("wealthNature", e.target.value)}

                    className="field-input"

                  >

                    <option value="">Select nature of wealth</option>

                    {wealthNatureOptions.map((o) => (

                      <option key={o} value={o}>{o}</option>

                    ))}

                  </select>

                </Field>



                <Field label="Primary wealth concern" required>

                  <select

                    required

                    value={form.wealthConcern}

                    onChange={(e) => update("wealthConcern", e.target.value)}

                    className="field-input"

                  >

                    <option value="">Select primary concern</option>

                    {wealthConcernOptions.map((o) => (

                      <option key={o} value={o}>{o}</option>

                    ))}

                  </select>

                </Field>



                <Field label="City" required>

                  <input

                    required

                    value={form.city}

                    onChange={(e) => update("city", e.target.value)}

                    className="field-input"

                    placeholder="Mumbai, Delhi, Bengaluru…"

                    autoComplete="address-level2"

                  />

                </Field>



                <Field label="Do you have an existing CA?" required>

                  <RadioGroup

                    name="hasCA"

                    value={form.hasCA}

                    onChange={(v) => update("hasCA", v)}

                    options={[

                      { value: "yes", label: "Yes" },

                      { value: "no", label: "No" },

                    ]}

                  />

                </Field>



                <Field label="Do you have an existing lawyer?" required>

                  <RadioGroup

                    name="hasLawyer"

                    value={form.hasLawyer}

                    onChange={(v) => update("hasLawyer", v)}

                    options={[

                      { value: "yes", label: "Yes" },

                      { value: "no", label: "No" },

                    ]}

                  />

                </Field>



                <Field label="Brief note — why are you applying?">

                  <textarea

                    value={form.applicationNote}

                    onChange={(e) => update("applicationNote", e.target.value.slice(0, 300))}

                    rows={4}

                    className="field-input resize-none h-auto py-3"

                    placeholder="Optional — share context for your application (max 300 characters)"

                  />

                  <p className="text-[11px] text-muted-foreground mt-1 text-right">

                    {form.applicationNote.length}/300

                  </p>

                </Field>



                <Field label="How did you hear about Aurelius?">

                  <select

                    value={form.hearAbout}

                    onChange={(e) => update("hearAbout", e.target.value)}

                    className="field-input"

                  >

                    <option value="">Optional</option>

                    {hearAboutOptions.map((o) => (

                      <option key={o} value={o}>{o}</option>

                    ))}

                  </select>

                </Field>



                {error && <Notice message={error} kind={noticeKind} />}



                <label className="flex items-start gap-3 cursor-pointer">

                  <input

                    type="checkbox"

                    checked={termsAccepted}

                    onChange={(e) => {

                      setTermsAccepted(e.target.checked);

                      if (e.target.checked) setTermsWarning(false);

                    }}

                    className="mt-0.5 rounded border-border"

                  />

                  <span className="text-xs text-muted-foreground leading-relaxed">

                    I have read and agree to the{" "}

                    <a

                      href="/terms-and-conditions"

                      target="_blank"

                      rel="noopener noreferrer"

                      className="text-[#c9a84c] hover:underline"

                    >

                      Terms &amp; Conditions

                    </a>{" "}

                    and{" "}

                    <a

                      href="/terms-and-conditions"

                      target="_blank"

                      rel="noopener noreferrer"

                      className="text-[#c9a84c] hover:underline"

                    >

                      Privacy Policy

                    </a>

                  </span>

                </label>



                {termsWarning && (

                  <p className="text-xs text-amber-400/90">Please accept the Terms &amp; Conditions to continue</p>

                )}



                <button type="submit" disabled={loading || !termsAccepted} className="btn-primary w-full h-12 shadow-luxury disabled:opacity-40">

                  {loading ? (

                    <>

                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting…

                    </>

                  ) : (

                    <>

                      Submit confidential application

                      <Send className="h-4 w-4" strokeWidth={1.5} />

                    </>

                  )}

                </button>

              </form>

            </motion.div>

          )}

        </AnimatePresence>



        {step !== "done" && (

          <p className="mt-8 text-xs text-muted-foreground text-center">

            Have an invitation?{" "}

            <Link to="/access" className="text-foreground hover:underline underline-offset-4">

              Activate membership

            </Link>

          </p>

        )}

      </div>



      {step !== "done" && <PremiumFooter variant="minimal" className="mt-auto shrink-0" />}

    </ImmersiveScene>

  );

}



function StepIndicator({ step }: { step: Step }) {

  const steps = [

    { id: "identity", label: "Identity" },

    { id: "verify", label: "Verify" },

    { id: "application", label: "Apply" },

  ] as const;

  const current = step === "done" ? 3 : steps.findIndex((s) => s.id === step);



  return (

    <div className="flex items-center gap-2 mb-8">

      {steps.map((s, i) => (

        <div key={s.id} className="flex items-center gap-2">

          <span

            className={`h-7 w-7 rounded-full text-[10px] grid place-items-center border ${

              i < current

                ? "border-gold/40 bg-gold/10 text-gold"

                : i === current

                  ? "border-gold bg-gold/20 text-gold"

                  : "border-border text-muted-foreground"

            }`}

          >

            {i < current ? <Check className="h-3 w-3" /> : i + 1}

          </span>

          <span

            className={`text-[10px] uppercase tracking-wider hidden sm:inline ${

              i <= current ? "text-foreground" : "text-muted-foreground"

            }`}

          >

            {s.label}

          </span>

          {i < steps.length - 1 && <span className="w-6 h-px bg-border/60 hidden sm:block" />}

        </div>

      ))}

    </div>

  );

}



function Notice({ message, kind, className = "" }: { message: string; kind: NoticeKind; className?: string }) {

  const styles = {

    error: "text-destructive border-destructive/30 bg-destructive/5",

    warning: "text-gold border-gold/30 bg-gold/5",

    info: "text-foreground border-border/40 bg-muted/30",

  } as const;



  return (

    <p className={`text-sm rounded-xl px-4 py-3 border ${styles[kind]} ${className}`} role="alert">

      {message}

      {kind === "info" && message.includes("sign in page") && (

        <>

          {" "}

          <Link to="/login" className="underline underline-offset-4">

            Sign in

          </Link>

        </>

      )}

    </p>

  );

}



function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {

  return (

    <div>

      <label className="text-xs text-muted-foreground tracking-wide">

        {label}

        {required && <span className="text-gold/80"> *</span>}

      </label>

      <div className="mt-1.5">{children}</div>

    </div>

  );

}



function RadioGroup({

  name,

  value,

  onChange,

  options,

}: {

  name: string;

  value: string;

  onChange: (value: string) => void;

  options: { value: string; label: string }[];

}) {

  return (

    <div className="flex gap-4 mt-1">

      {options.map((opt) => (

        <label key={opt.value} className="inline-flex items-center gap-2 text-sm cursor-pointer">

          <input

            type="radio"

            name={name}

            value={opt.value}

            checked={value === opt.value}

            onChange={() => onChange(opt.value)}

            className="accent-gold"

          />

          {opt.label}

        </label>

      ))}

    </div>

  );

}

