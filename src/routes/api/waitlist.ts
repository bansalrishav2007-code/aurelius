import { createFileRoute } from "@tanstack/react-router";

import { consumeVerificationToken } from "@/lib/auth/otp.store.server";

import { addWaitlistEntry } from "@/lib/auth/store.server";

import {

  sendApplicationReceivedEmail,

  sendWaitlistAdminNotificationEmail,

} from "@/lib/email/application.server";



export const Route = createFileRoute("/api/waitlist")({

  server: {

    handlers: {

      POST: async ({ request }) => {

        const body = (await request.json().catch(() => ({}))) as {

          fullName?: string;

          email?: string;

          phone?: string;

          company?: string;

          profession?: string;

          wealthNature?: string;

          wealthConcern?: string;

          netWorthBand?: string;

          city?: string;

          hasCA?: "yes" | "no";

          hasLawyer?: "yes" | "no";

          applicationNote?: string;

          hearAbout?: string;

          whyAccess?: string;

          verificationToken?: string;

        };



        const email = body.email?.trim().toLowerCase() ?? "";

        const verificationToken = body.verificationToken?.trim() ?? "";



        if (!verificationToken) {

          return Response.json({ error: "Email verification is required before submitting." }, { status: 403 });

        }



        const verified = await consumeVerificationToken(verificationToken, email);

        if (!verified.ok) {

          return Response.json({ error: verified.error }, { status: 403 });

        }



        if (

          !body.fullName?.trim() ||

          !email ||

          !body.phone?.trim() ||

          !body.profession?.trim() ||

          !body.wealthNature?.trim() ||

          !body.wealthConcern?.trim() ||

          !body.city?.trim() ||

          !body.hasCA ||

          !body.hasLawyer

        ) {

          return Response.json({ error: "Please complete all required fields." }, { status: 400 });

        }



        if (body.applicationNote && body.applicationNote.length > 300) {

          return Response.json({ error: "Brief note must be 300 characters or fewer." }, { status: 400 });

        }



        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

          return Response.json({ error: "Enter a valid email address." }, { status: 400 });

        }



        if (body.phone.trim().length < 8) {

          return Response.json({ error: "Enter a valid phone number." }, { status: 400 });

        }



        const emailVerifiedAt = new Date().toISOString();

        const result = await addWaitlistEntry({

          fullName: body.fullName.trim(),

          email,

          phone: body.phone.trim(),

          company: body.company?.trim() || undefined,

          profession: body.profession.trim(),

          wealthNature: body.wealthNature.trim(),

          wealthConcern: body.wealthConcern.trim(),

          netWorthBand: body.netWorthBand?.trim() || undefined,

          city: body.city.trim(),

          hasCA: body.hasCA,

          hasLawyer: body.hasLawyer,

          applicationNote: body.applicationNote?.trim() || undefined,

          hearAbout: body.hearAbout?.trim() || undefined,

          whyAccess: body.applicationNote?.trim() || body.whyAccess?.trim() || undefined,

          emailVerifiedAt,

        });



        if (!result.ok) {

          return Response.json({ error: result.error }, { status: 409 });

        }



        await Promise.all([

          sendApplicationReceivedEmail({

            to: email,

            fullName: body.fullName.trim(),

            referenceNumber: result.reference,

          }),

          sendWaitlistAdminNotificationEmail({

            fullName: body.fullName.trim(),

            email,

            phone: body.phone.trim(),

            profession: body.profession.trim(),

            wealthNature: body.wealthNature.trim(),

            wealthConcern: body.wealthConcern.trim(),

            city: body.city.trim(),

            referenceNumber: result.reference,

          }),

        ]);



        return Response.json({ ok: true, id: result.id, reference: result.reference });

      },

    },

  },

});

