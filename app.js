/* Trustly Pay-by-Bank Return Recovery Journey
   v3 — dynamic retry timing, no fee references, multi-file build */

/* ============================================================ */
/* Data                                                          */
/* ============================================================ */

const TJ_PHASES = [
  { name: 'Auto-retry & soft', a: 0, b: 10, cls: 'p1' },
  { name: 'Past due',          a: 10, b: 30, cls: 'p2' },
  { name: 'Pre-collections',   a: 30, b: 60, cls: 'p3' },
  { name: 'Final / charge-off',a: 60, b: 90, cls: 'p4' }
];

const TJ_AXIS = [0, 7, 14, 30, 45, 60, 75, 90];

const TJ_NSF = [
  { id:'nsf-0', day:0, label:'return received', tone:'soft', ch:['E','S'], system:'Auto · queue retry attempts',
    title:'Bank returns the payment as NSF',
    body:'The bank reports insufficient funds at the moment of debit. The system marks the transaction RETURN_NSF, queues up to two automatic retries to run sometime in the week following the return (exact timing is dynamic — it depends on processor windows and merchant configuration), and pauses the originating bank account for new Trustly payments. The customer is reassured that this is routine.',
    msgs:[
      { ch:'Email', subj:'A quick update about your $X payment to [merchant]',
        body:"Hi [first name],\n\nA few days ago you paid [merchant] $X using your bank account. We're Trustly — the payments service [merchant] used to securely move the money from your bank. That's why this email comes from us instead of [merchant].\n\nWhen we tried to pull the funds today, your bank let us know there wasn't enough in the account at that moment. This is one of the most common things we see, and it usually clears itself up within a few days as your balance updates.\n\nWhat happens next:\n  • We'll automatically try again sometime over the next week — nothing for you to do\n  • If one of those retries works, you're all set, and we'll confirm by email\n  • If neither one works, we'll ask you to take action\n\nWhile we work on this, the bank account you used is paused for new payments through Trustly. It'll be available again as soon as a retry succeeds.\n\nQuestions? Just reply to this email — a real person will get back to you.\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: Heads up — your $X payment to [merchant] didn't go through (your bank reported insufficient funds). We'll auto-retry over the next week, no action needed. Reply STOP to opt out." }
    ]
  },
  { id:'nsf-1', day:2, label:'first retry attempt', tone:'soft', ch:['E','S'], system:'Auto · first re-presentment',
    title:'First automatic retry',
    body:'The system re-presents the ACH debit. Exact timing within the first few days after the original return is dynamic — depends on processor windows. If accepted, the customer is notified and the bank account is re-enabled. If returned again, a second retry is queued for later in the same week.',
    msgs:[
      { ch:'Email', subj:"We're trying your $X payment again",
        body:"Hi [first name],\n\nQuick update — we're attempting your $X payment to [merchant] again.\n\nIf your account has the funds available, your bank will accept the payment, your account will be re-enabled for future Trustly payments, and we'll send you a confirmation within a couple of business days.\n\nIf it doesn't go through this time, we'll try one more time later this week before asking you to take action.\n\nNothing you need to do today.\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: Retrying your $X payment to [merchant]. We'll let you know how it goes." }
    ]
  },
  { id:'nsf-2', day:5, label:'second retry attempt', tone:'soft', ch:['E','S'], system:'Auto · second re-presentment (last NACHA-permitted)',
    title:'Second automatic retry',
    body:'Last NACHA-permitted re-presentment, expected within the same week as the original return. Tone shifts slightly to prepare the customer for manual repayment if this attempt also fails.',
    msgs:[
      { ch:'Email', subj:'Last automatic attempt on your $X payment',
        body:"Hi [first name],\n\nThis is our final automatic attempt to collect $X for your purchase from [merchant]. Two things can happen:\n\n  • If your bank accepts it, you're done. We'll send a confirmation and your bank account will be re-enabled for future Trustly payments.\n  • If it returns again, we'll stop trying automatically and send you a link to wrap it up yourself — using any payment method you like (bank, debit, or credit).\n\nWant to get ahead of this? Reply to this email and we'll help you set it up before the retry runs.\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: Last auto-retry coming up on your $X to [merchant]. If it doesn't go through, we'll send a link so you can pay any way." }
    ]
  },
  { id:'nsf-3', day:10, label:'manual repayment', tone:'firm', ch:['E','S'], system:'Manual · open repayment link',
    title:'Both retries failed — switch to customer-driven repayment',
    body:'Auto-retries are exhausted. The customer is now responsible for completing the payment. All repayment methods (bank, debit, credit) are surfaced. The originating bank account remains paused.',
    msgs:[
      { ch:'Email', subj:'Quick action needed on your $X payment',
        body:"Hi [first name],\n\nWe tried twice to collect your $X payment to [merchant] from your bank account this past week, and both times it came back as insufficient funds. We're not going to keep trying automatically — instead, we want to make this easy to wrap up.\n\nPay it now, your way: [Pay $X →]\n  • Use a different bank account\n  • Use a debit or credit card\n  • Either takes less than a minute\n\nA couple of things to keep in mind:\n  • The bank account you originally used is still paused for Trustly payments. Completing this payment from another method will help everything go back to normal.\n  • Need to break this into smaller chunks? We can set up a payment plan — just let us know.\n\nIf something's going on that we should know about, reply to this email and a real person will help you figure out the next step.\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: We couldn't process your $X to [merchant] from your bank. Pay any way (bank/card): [link]" }
    ]
  },
  { id:'nsf-4', day:14, label:'past due', tone:'firm', ch:['E','S'], system:'Auto-triggered',
    title:'Past due — first reminder',
    body:'Customer-facing past-due framing begins. Reinforce self-serve repayment and begin surfacing payment plan as an option.',
    msgs:[
      { ch:'Email', subj:'Your balance with [merchant] is now past due',
        body:"Hi [first name],\n\nJust a heads-up — your $X payment to [merchant] is now past due. We'd love to help you wrap this up:\n  • [Pay $X now] — bank, debit, or credit card\n  • [Set up a payment plan] — split into smaller installments\n  • [Reply to this email] — a real person can help\n\nA reminder: the bank account you originally used is paused for Trustly payments. Settling up here will help everything go back to normal.\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: Your payment to [merchant] is past due — $X owed. Pay now: [link]" }
    ]
  },
  { id:'nsf-5', day:21, label:'past due', tone:'firm', ch:['E','S'], system:'Auto-triggered',
    title:'Second past-due reminder',
    body:'Reinforce consequences (future declines on file with merchant, possible service interruption) and the path to resolution.',
    msgs:[
      { ch:'Email', subj:"Still here when you're ready — $X owed",
        body:"Hi [first name],\n\nYour balance of $X for your purchase from [merchant] hasn't been resolved yet. We wanted to send another quick note before things escalate.\n\nWhy this matters:\n  • [merchant] may decline future purchases until this is sorted\n  • The bank account you originally used remains paused for Trustly\n\nThree easy paths:\n  • [Pay $X in full]\n  • [Split it into a payment plan]\n  • [Reply and tell us what's going on] — we want to help\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: $X still due to [merchant]. Pay or set up a plan: [link]" }
    ]
  },
  { id:'nsf-6', day:30, label:'30 days past due', tone:'firm', ch:['E','S'], system:'Auto · flag delinquent',
    title:'30 days past due — promise-to-pay outreach',
    body:'Account flagged 30+ days delinquent. Formal payment plan and hardship paths surface. Internal: notify merchant of risk status.',
    msgs:[
      { ch:'Email', subj:'Your account with [merchant] is 30 days past due',
        body:"Hi [first name],\n\nYour $X balance for [merchant] is now 30 days past due. We don't want this to escalate further, and we have flexible options to help you resolve it.\n\nWhat we can offer:\n  1. Pay in full — [Pay $X now]\n  2. Payment plan — split into 3 or 6 monthly installments [Choose plan]\n  3. Hardship support — if you're going through something tough financially, tell us and we'll work with you [Talk to us]\n\nWhat may happen if this isn't resolved:\n  • [merchant] may suspend or cancel your access to their service\n  • This may affect your ability to use Trustly with other merchants\n  • At 60 days, we may begin reporting this to consumer reporting agencies\n\nWe'd much rather find a solution with you than escalate. Just reply and a real person will respond.\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: $X now 30 days past due to [merchant]. Pay or arrange a plan: [link]" }
    ]
  },
  { id:'nsf-7', day:45, label:'pre-collections', tone:'firm', ch:['E','S','P'], system:'Manual · enter agent queue',
    title:'Pre-collections — first live agent outreach',
    body:'Agent calls begin during TCPA-compliant business hours. Position as a final attempt to resolve directly before formal collections handoff.',
    msgs:[
      { ch:'Email', subj:'Important: your account may go to collections in 15 days',
        body:"Hi [first name],\n\nYour $X balance for [merchant] is now 45 days past due. We've tried to reach you a few times, and we want to make one more good-faith attempt to resolve this directly with you before involving anyone else.\n\nIf we don't hear from you in the next 15 days, this account will be referred to a third-party collections agency. We don't want to do that.\n\nWhat we can still do:\n  • [Pay in full] — clears the balance\n  • [Settle for less] — talk to us about a discounted settlement\n  • [Hardship plan] — make smaller payments over more time\n  • [Talk to a specialist] — schedule a call with someone on our team\n\nA specialist may also call you in the next several days during normal business hours. If you'd rather not get a call, just reply and tell us how you'd prefer to be reached.\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: Your account with [merchant] may go to collections in 15 days. Resolve: [link] or call [number]" },
      { ch:'Call', subj:'',
        body:"Hi [name], this is [agent] calling from Trustly on behalf of [merchant]. We've been trying to reach you about your outstanding balance of $X from your purchase. I wanted to call directly because I'd much rather find a way to resolve this with you than escalate it. We have payment plans starting at $[X]/month, and I have some flexibility to help make this work for you. Do you have a couple of minutes to walk through the options?" }
    ]
  },
  { id:'nsf-8', day:60, label:'final notice', tone:'final', ch:['E','P'], system:'Manual · final notice + agent',
    title:'Final notice before charge-off',
    body:'Formal final notice. Outline credit reporting risk and collections handoff explicitly. Multiple channels same day.',
    msgs:[
      { ch:'Email', subj:'Final notice — $X owed to [merchant]',
        body:"Hi [first name],\n\nThis is a formal final notice. Your $X balance for [merchant] has been past due for 60 days.\n\nIf this is not resolved by [day 75 date], we will:\n  • Charge off the account internally\n  • Transfer the debt to a third-party collections agency\n  • Report this to consumer reporting agencies, which may affect your credit score\n\nWe're still on your side and would much rather work with you directly. Today, we can:\n  • [Pay in full] — wraps everything up\n  • [Discounted settlement offer] — reach out to discuss what's possible\n  • [Hardship plan] — small monthly payments, no judgment\n\nA specialist will also try to call you in the coming days. If you'd prefer email or text, just let us know.\n\n— The Trustly team" },
      { ch:'Call', subj:'',
        body:"Hi [name], this is [agent] from Trustly. I'm calling because your $X balance with [merchant] is now 60 days past due, and we're approaching the point where we'd need to refer this to collections. I really don't want to do that. I have authority to offer you a settlement amount or set up a hardship plan today — would you have a few minutes to figure out a way forward together?" }
    ]
  },
  { id:'nsf-9', day:75, label:'settlement offer', tone:'final', ch:['E','P'], system:'Manual · settlement window opens',
    title:'Last-chance settlement offer',
    body:'Surface explicit discounted settlement (commonly 60–80% to resolve). Final agent attempts during this window.',
    msgs:[
      { ch:'Email', subj:'A discounted offer to wrap this up',
        body:"Hi [first name],\n\nWe'd like to make you a one-time offer to close this out: pay $[settled amount] by [day 89 date], and we'll consider the full $X balance for [merchant] resolved.\n\nThis offer expires at the end of business on [date]. After that, the full balance will be referred to collections.\n\n  • [Accept this settlement]\n  • [Pay in full instead]\n  • [Reply and let's talk]\n\nWe're trying to give you a way out that works for both of us. Hope to hear from you.\n\n— The Trustly team" },
      { ch:'Call', subj:'',
        body:"Hi [name], this is [agent] from Trustly. We're trying one more time before this goes to collections. I can offer you $[settled amount] right now to settle the full $X balance — that's [percentage]% off. Could you take care of this with me on the phone?" }
    ]
  },
  { id:'nsf-10', day:90, label:'charge-off', tone:'final', ch:['E'], system:'Auto · charge off + handoff',
    title:'Charge-off and collections handoff',
    body:'Account is internally charged off. File transferred to third-party collections agency. Customer notified per state and federal disclosure requirements.',
    msgs:[
      { ch:'Email', subj:'Your account has been transferred to [collections agency]',
        body:"Hi [first name],\n\nWe weren't able to resolve your $X balance for [merchant], so as of today the account has been transferred to [collections agency] for further handling. They will contact you directly going forward.\n\nYou still have rights:\n  • You may resolve or dispute the debt by contacting [collections agency] at [number]\n  • Federal law gives you 30 days from their first contact to dispute the validity of the debt in writing\n  • The bank account originally used through Trustly remains paused for our service\n\nIf you have any questions about how this happened, you can still reply to this email.\n\n— The Trustly team" }
    ]
  }
];

const TJ_NON = [
  { id:'non-0', day:0, label:'return received', tone:'soft', ch:['E','S'], system:'No retry · prompt manual repayment',
    title:'Bank returns payment (closed, invalid, unauthorized, or frozen)',
    body:'No auto-retry possible — the bank has indicated the account itself is unusable for this debit. Customer must update the payment method or pay another way. The originating bank account is paused for future Trustly payments.',
    msgs:[
      { ch:'Email', subj:'We hit a snag with your $X payment to [merchant]',
        body:"Hi [first name],\n\nA few days ago you paid [merchant] $X using your bank account. We're Trustly — the payments service [merchant] used to securely move the money from your bank. That's why this email comes from us instead of [merchant].\n\nWhen we tried to process the payment today, your bank returned it. The reason they gave was that this account either has been closed, isn't set up to accept payments like this, or wasn't authorized for this charge. We don't get more detail than that — your bank knows the specifics.\n\nA few things to know:\n  • We're not going to retry this automatically. Your bank told us this account isn't usable for this payment, and trying again would just hit the same wall.\n  • This bank account is now paused for any future Trustly payments until you resolve this.\n  • Your purchase from [merchant] is still on hold pending payment.\n\nTo take care of it, you have two simple options:\n  1. Use a different payment method — bank, debit, or credit card all work [Pay now]\n  2. Update or verify your bank info — if you think this was a mistake or your account info needs updating [Update bank info]\n\nEither takes about a minute. If something else is going on, just reply to this email and a real person will help.\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: Your $X payment to [merchant] couldn't be processed (bank returned it). Update bank info or pay another way: [link]" }
    ]
  },
  { id:'non-1', day:2, label:'reminder', tone:'soft', ch:['E','S'], system:'Auto-triggered',
    title:'Friendly reminder to update payment method',
    body:'Second nudge, still framed as a logistical fix rather than a delinquency. Reinforce that auto-retry is not happening.',
    msgs:[
      { ch:'Email', subj:'A friendly reminder about your $X payment',
        body:"Hi [first name],\n\nJust a quick reminder — your $X payment to [merchant] is still outstanding. Your bank wasn't able to process the original payment, so we'll need you to take a quick action to wrap this up.\n\nTwo easy options:\n  1. [Pay with a different method] — bank, debit, or credit card\n  2. [Update your bank info] — and we'll try again with the corrected details\n\nThe bank account you used is still paused for Trustly payments until this is resolved. If you've already taken care of this, please ignore this email — it can take up to 24 hours for our records to update.\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: Quick reminder — $X to [merchant] is still outstanding. Update or pay another way: [link]" }
    ]
  },
  { id:'non-2', day:7, label:'past due', tone:'firm', ch:['E','S'], system:'Auto-triggered',
    title:'First past-due notice — payment cannot be retried',
    body:'Tone shifts to past-due. Make explicit that an auto-retry is not happening; customer action is required.',
    msgs:[
      { ch:'Email', subj:'Your $X payment is now past due',
        body:"Hi [first name],\n\nYour $X payment to [merchant] is now past due. Because your bank flagged the original account, we can't retry the payment for you — you'll need to complete it manually using a different method or by updating your bank info.\n\n  • [Pay $X now] — bank, debit, or credit card accepted\n  • [Update your bank info] — and we'll try again\n\nThe bank account originally used remains paused for Trustly payments.\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: $X to [merchant] is past due. We can't auto-retry this — pay manually: [link]" }
    ]
  },
  { id:'non-3', day:14, label:'past due', tone:'firm', ch:['E','S'], system:'Auto-triggered',
    title:'Past due — second reminder',
    body:'Continued past-due framing. Surface payment plan as an option. From this point forward, NSF and non-NSF dunning is essentially the same.',
    msgs:[
      { ch:'Email', subj:'$X still owed to [merchant]',
        body:"Hi [first name],\n\nYour $X payment to [merchant] is still outstanding. We'd love to help you wrap this up before things escalate.\n\nResolve this today: [Pay now]\n\nNeed to break this into smaller payments? [See plan options]\n\nThe bank account originally used is still paused for Trustly payments.\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: $X due to [merchant]. Pay or set up a plan: [link]" }
    ]
  },
  { id:'non-4', day:21, label:'past due', tone:'firm', ch:['E','S'], system:'Auto-triggered',
    title:'Past due — final reminder before delinquency',
    body:'Reinforce consequences and the path to resolution. Same content shape as the NSF flow from this point on.',
    msgs:[
      { ch:'Email', subj:'$X still owed — let us help you resolve it',
        body:"Hi [first name],\n\nYour balance of $X for [merchant] is still outstanding. To avoid possible service interruption with [merchant], please take action today.\n\n  • [Pay now]\n  • [Set up a payment plan]\n  • [Talk to us]\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: $X still due to [merchant]. Resolve today: [link]" }
    ]
  },
  { id:'non-5', day:30, label:'30 days past due', tone:'firm', ch:['E','S'], system:'Auto · flag delinquent',
    title:'30 days past due — promise-to-pay outreach',
    body:'Same playbook as NSF flow — formal payment plan and hardship paths.',
    msgs:[
      { ch:'Email', subj:'Your account with [merchant] is 30 days past due',
        body:"Hi [first name],\n\nYour balance of $X is now 30 days past due. Three ways to resolve this:\n\n  1. Pay in full — [Pay now]\n  2. Payment plan — split into [N] installments\n  3. Hardship — tell us what's going on and we'll work with you\n\nContinued non-payment may affect your ability to use [merchant] services in the future.\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: $X is 30 days past due to [merchant]. Pay or set up a plan: [link]" }
    ]
  },
  { id:'non-6', day:45, label:'pre-collections', tone:'firm', ch:['E','S','P'], system:'Manual · enter agent queue',
    title:'Pre-collections — first live agent outreach',
    body:'Begin live-agent calls during TCPA-compliant windows. Final pre-collections attempt.',
    msgs:[
      { ch:'Email', subj:'Important: your account may go to collections',
        body:"Hi [first name],\n\nYour balance of $X for [merchant] is 45 days past due. If unresolved in 15 days, this account will be referred to a third-party collections agency.\n\nA Trustly specialist may also call you. We'd rather work directly with you.\n\n  • [Pay now]\n  • [Set up a plan]\n  • [Talk to us]\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: Account may go to collections in 15 days. Resolve now: [link] or call [number]" },
      { ch:'Call', subj:'',
        body:"Hi [name], this is [agent] from Trustly calling on behalf of [merchant]. I'm reaching out about your $X balance. We have payment plans starting at $[X]/month, and I have some flexibility to help make this work for you — can we set something up today?" }
    ]
  },
  { id:'non-7', day:60, label:'final notice', tone:'final', ch:['E','P'], system:'Manual · final notice + agent',
    title:'Final notice before charge-off',
    body:'Formal written final notice plus agent call. Same mechanics as NSF flow.',
    msgs:[
      { ch:'Email', subj:'Final notice — $X owed to [merchant]',
        body:"Hi [first name],\n\nThis is a final notice. Your $X balance with [merchant] is 60 days past due.\n\nIf unresolved by [day 75 date], this debt will be charged off, transferred to a collections agency, and may be reported to consumer reporting agencies.\n\n  • [Resolve now]\n  • [Talk to a specialist]\n\n— The Trustly team" },
      { ch:'Call', subj:'',
        body:"Hi [name], this is [agent] from Trustly. Your $X balance is now 60 days past due. I have authority to offer you a settlement or a hardship plan today — can we work something out before this goes to collections?" }
    ]
  },
  { id:'non-8', day:75, label:'settlement offer', tone:'final', ch:['E','P'], system:'Manual · settlement window opens',
    title:'Last-chance settlement offer',
    body:'Discounted settlement offer. Same mechanics as NSF flow.',
    msgs:[
      { ch:'Email', subj:'A discounted offer to close your account',
        body:"Hi [first name],\n\nOne-time settlement: pay $[settled] by [day 89 date] to resolve the full $X balance with [merchant].\n\nOffer expires end of business [date]. After that, the full balance is referred to collections.\n\n  • [Accept settlement]\n  • [Pay in full instead]\n\n— The Trustly team" },
      { ch:'Call', subj:'',
        body:"Hi [name], one more attempt before this goes to collections. I can offer you $[settled] to settle the full $X balance. Can we close this out on the phone right now?" }
    ]
  },
  { id:'non-9', day:90, label:'charge-off', tone:'final', ch:['E'], system:'Auto · charge off + handoff',
    title:'Charge-off and collections handoff',
    body:'Account charged off internally. File transferred to third-party collections per state and federal disclosure requirements.',
    msgs:[
      { ch:'Email', subj:'Your account has been transferred to [collections agency]',
        body:"Hi [first name],\n\nAs of today, your $X balance for [merchant] has been transferred to [collections agency] for further handling. They will contact you directly.\n\nYou may still resolve or dispute the debt by contacting [collections agency] at [number], or by replying to this email within 30 days as required by federal law.\n\n— Trustly, on behalf of [merchant]" }
    ]
  }
];

const TJ_EVENTS = [
  { id:'evt-decline', when:'New payment attempt while a balance is open', tone:'firm', ch:['E','S'],
    system:'Trigger · new txn declined while balance is open',
    title:'New transaction declined',
    body:'Fires whenever a customer with an unpaid balance attempts a new payment via Trustly (on the original merchant or any other Trustly merchant). The new transaction is declined and an email + SMS go out immediately to explain the reason and the path back.',
    msgs:[
      { ch:'Email', subj:'About your declined payment to [merchant]',
        body:"Hi [first name],\n\nWe just tried to process your $X payment to [merchant] using Trustly — the payments service [merchant] used to move money from your bank — but we weren't able to complete it. We wanted to reach out directly so you know what's going on.\n\nHere's the reason: you have an outstanding balance of $X from an earlier purchase with [original merchant] that hasn't been resolved yet. While that balance is open, we can't process new payments for you through Trustly.\n\nTwo ways to get back on track:\n  • Clear the previous balance — [Pay $X now] (bank, debit, or credit card)\n  • Tell us what's going on — [Reply or talk to a specialist]\n\nAs soon as the previous balance is taken care of, you'll be able to use Trustly again for [merchant] and any other merchant that accepts us. We'll send a quick confirmation when you're all set.\n\nIf you've already paid or think this is a mistake, just reply to this email — give us up to 24 hours for our records to update.\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: We declined your $X to [merchant] — you have an unpaid $X balance from [original merchant]. Clear it to use Trustly again: [link]" }
    ]
  },
  { id:'evt-payment-received', when:'Balance reaches $0 from any payment path', tone:'soft', ch:['E','S'],
    system:'Trigger · payment received, balance cleared',
    title:'Payment received — balance cleared',
    body:'Fires when the balance reaches $0 from any source: successful auto-retry, manual repayment, plan installment, settlement, or merchant-side adjustment. Closes the loop, re-enables the bank account for future Trustly payments, and notifies the merchant to restore any paused service.',
    msgs:[
      { ch:'Email', subj:'All cleared up — your payment to [merchant] is complete',
        body:"Hi [first name],\n\nQuick confirmation: we received your $X payment for [merchant]. Your balance is now cleared.\n\nA couple of things you should know:\n  • Your bank account is back online for Trustly payments. You can use it with [merchant] and any other merchant that accepts Trustly.\n  • [merchant] has been notified that this is resolved — they'll restore any service or access on their side if it was paused.\n  • If you set up a payment plan with us earlier, no further installments will be charged — we'll cancel the rest.\n\nThanks for sticking with us through this. If anything looks off or you have questions, just reply to this email.\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: Got it — your $X payment to [merchant] is complete and your balance is cleared. Your bank account is back online for Trustly. Thanks!" }
    ]
  },
  { id:'evt-plan-agreed', when:'Customer accepts a payment plan', tone:'soft', ch:['E','S'],
    system:'Trigger · payment plan activated',
    title:'Payment plan agreed',
    body:'Fires when a customer accepts a payment plan offer through self-serve or an agent. Sets clear expectations on cadence, payment method, and what happens if circumstances change. Pauses other dunning while the plan is on track.',
    msgs:[
      { ch:'Email', subj:'Your payment plan is all set up',
        body:"Hi [first name],\n\nWe've set up your payment plan for the $X balance with [merchant]. Here's what to expect:\n\n  • [N] payments of $[X] each\n  • First payment on [date], then every [N] days after\n  • We'll send a reminder a couple of days before each one\n  • Method on file: [payment method]\n\nWhat this means:\n  • No further escalation as long as your plan stays on track\n  • Your bank account stays paused for new Trustly payments until the plan is complete\n  • If you ever need to adjust or pause the plan, just reply — we have flexibility\n\nYou can also pay it all off early at any time, with no penalty: [Pay remaining balance]\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: Your payment plan with [merchant] is set — [N] payments of $[X], first on [date]. We'll remind you ahead of each one." }
    ]
  },
  { id:'evt-hardship', when:'Customer requests hardship support', tone:'soft', ch:['E'],
    system:'Trigger · hardship request received · pauses dunning',
    title:'Hardship request received',
    body:'Fires when a customer requests hardship help via reply, form, or agent. Immediately pauses all automated dunning on this account and routes the case to a specialist queue. Sets expectations that a real person will reach out.',
    msgs:[
      { ch:'Email', subj:"We got your message — let's figure this out together",
        body:"Hi [first name],\n\nWe received your note about going through a hardship. Thanks for reaching out — that takes courage and we genuinely want to help you find a path forward.\n\nHere's what happens next:\n  • A specialist will reach out within 2 business days to talk through options. We can offer reduced payment amounts, longer payment terms, temporary holds, or in some cases settlement.\n  • In the meantime, we've paused all reminders and any further escalation on this account. You won't get past-due notices while we're working with you.\n  • Your bank account remains paused for new Trustly payments, but that doesn't affect anything else on your bank account.\n\nIf your situation is urgent or you'd like to reach out directly, you can [Schedule a call] or reply to this email anytime.\n\nWe'll be in touch soon.\n\n— The Trustly team" }
    ]
  },
  { id:'evt-promise-broken', when:'An agreed payment date passes without payment', tone:'firm', ch:['E','S'],
    system:'Trigger · promise-to-pay broken',
    title:'Promise-to-pay broken',
    body:'Fires when a customer agreed to pay by a specific date and that date passes without payment. Soft escalation first: notify, give a brief recovery window, then resume normal dunning if no response.',
    msgs:[
      { ch:'Email', subj:"Your scheduled payment didn't come through",
        body:"Hi [first name],\n\nA few days ago you arranged to pay $[amount] toward your balance with [merchant] on [date], but the payment didn't come through. We wanted to check in before this affects anything.\n\nTwo things can happen now:\n  • Pay today and we'll keep everything on track — [Pay $[amount] now]\n  • Let us know if something changed and we'll work with you — [Reply or talk to a specialist]\n\nIf we don't hear from you in the next [N] days, we'll need to resume our normal collections process. We'd rather not, so please reach out if anything's going on.\n\n— The Trustly team" },
      { ch:'SMS', subj:'',
        body:"Trustly: Your $[amount] payment to [merchant] (due [date]) didn't come through. Pay now or let us know: [link]" }
    ]
  },
  { id:'evt-dispute', when:'Customer disputes the debt', tone:'firm', ch:['E'],
    system:'Trigger · dispute filed · pauses dunning per FDCPA',
    title:'Dispute received',
    body:'Fires when a customer disputes the debt. Immediately pauses all collection activity until the dispute is reviewed (FDCPA-style validation pause). Sets clear expectations on review timeline and outcomes.',
    msgs:[
      { ch:'Email', subj:'We received your dispute about your payment with [merchant]',
        body:"Hi [first name],\n\nWe received your message that you dispute the $X balance for [merchant]. We take this seriously — here's how we'll handle it.\n\nWhat happens now:\n  • Our team will review your account, the original transaction with [merchant], and any documentation you've shared, within [N] business days.\n  • All collection activity is paused on this account until our review is complete.\n  • If you want to add more context or documentation, just reply to this email with anything you'd like us to consider.\n\nWhat you can expect to hear back:\n  • If we agree the balance shouldn't be owed, we'll clear it from your account and notify [merchant].\n  • If we don't agree, we'll explain why and send the validation documentation you're entitled to under federal law.\n\nWe'll be back in touch as soon as the review is complete.\n\n— The Trustly team" }
    ]
  }
];

/* ============================================================ */
/* Utilities                                                     */
/* ============================================================ */

function tjEsc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
const tjPos = (d) => d <= 14 ? (d/14)*50 : 50 + ((d-14)/76)*50;

/* ============================================================ */
/* Storage (state v2: overrides + custom + deleted)              */
/* ============================================================ */

const TJ_STORAGE_KEY = 'trustly-rj-state-v2';
const TJ_LEGACY_KEY  = 'trustly-rj-overrides-v1';

function tjEmptyState(){ return { overrides:{}, custom:{ nsf:[], non:[], events:[] }, deleted:[] }; }

function tjLoadState(){
  try {
    const raw = localStorage.getItem(TJ_STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      s.overrides = s.overrides || {};
      s.custom = s.custom || { nsf:[], non:[], events:[] };
      s.custom.nsf = s.custom.nsf || []; s.custom.non = s.custom.non || []; s.custom.events = s.custom.events || [];
      s.deleted = s.deleted || [];
      return s;
    }
    const legacy = localStorage.getItem(TJ_LEGACY_KEY);
    if (legacy) return { overrides: JSON.parse(legacy), custom:{ nsf:[], non:[], events:[] }, deleted:[] };
  } catch(e){}
  return tjEmptyState();
}

function tjSaveState(state){
  try { localStorage.setItem(TJ_STORAGE_KEY, JSON.stringify(state)); }
  catch(e){ console.warn('Could not save state', e); }
}

function tjLoadOverrides(){ return tjLoadState().overrides; }
function tjSaveOverrides(o){ const s = tjLoadState(); s.overrides = o; tjSaveState(s); }

/* ============================================================ */
/* Stage access                                                  */
/* ============================================================ */

function tjGetNSFStages(){
  const s = tjLoadState();
  return TJ_NSF.concat(s.custom.nsf).filter(st => !s.deleted.includes(st.id)).slice().sort((a,b) => a.day - b.day);
}
function tjGetNONStages(){
  const s = tjLoadState();
  return TJ_NON.concat(s.custom.non).filter(st => !s.deleted.includes(st.id)).slice().sort((a,b) => a.day - b.day);
}
function tjGetEventStages(){
  const s = tjLoadState();
  return TJ_EVENTS.concat(s.custom.events).filter(st => !s.deleted.includes(st.id));
}
function tjGetTimelineStages(flow){ return flow === 'nsf' ? tjGetNSFStages() : tjGetNONStages(); }

function tjStageById(id){
  return tjGetNSFStages().concat(tjGetNONStages()).concat(tjGetEventStages()).find(s => s.id === id);
}

function tjIsCustomStage(id){
  const s = tjLoadState();
  return s.custom.nsf.some(x => x.id === id) || s.custom.non.some(x => x.id === id) || s.custom.events.some(x => x.id === id);
}

/* ============================================================ */
/* Effective messages + overrides                                */
/* ============================================================ */

function tjEffectiveMsg(stageId, idx){
  const stage = tjStageById(stageId);
  if (!stage) return null;
  const original = stage.msgs[idx];
  const overrides = tjLoadOverrides();
  const ov = (overrides[stageId] && overrides[stageId][idx]) || {};
  return { ch: original.ch, subj: ov.subj !== undefined ? ov.subj : original.subj, body: ov.body !== undefined ? ov.body : original.body };
}

function tjSetOverride(stageId, idx, field, value){
  const stage = tjStageById(stageId);
  if (!stage) return;
  const original = stage.msgs[idx];
  const state = tjLoadState();
  const overrides = state.overrides;
  if (!overrides[stageId]) overrides[stageId] = {};
  if (!overrides[stageId][idx]) overrides[stageId][idx] = {};
  if (value === original[field]) {
    delete overrides[stageId][idx][field];
    if (Object.keys(overrides[stageId][idx]).length === 0) delete overrides[stageId][idx];
    if (Object.keys(overrides[stageId]).length === 0) delete overrides[stageId];
  } else {
    overrides[stageId][idx][field] = value;
  }
  tjSaveState(state);
  tjRefreshEditedIndicators();
}

function tjStageHasEdits(stageId){
  const overrides = tjLoadOverrides();
  return !!overrides[stageId];
}

function tjEditCount(){
  const state = tjLoadState();
  let stages = 0, msgs = 0;
  Object.keys(state.overrides).forEach(sid => {
    stages++;
    Object.keys(state.overrides[sid]).forEach(() => msgs++);
  });
  const custom = state.custom.nsf.length + state.custom.non.length + state.custom.events.length;
  const deleted = state.deleted.length;
  return { stages, msgs, custom, deleted };
}

function tjRefreshEditedIndicators(){
  document.querySelectorAll('.tj .dot').forEach(d => {
    d.classList.toggle('edited', tjStageHasEdits(d.dataset.id));
  });
  document.querySelectorAll('.tj .event-chip').forEach(c => {
    c.classList.toggle('edited', tjStageHasEdits(c.dataset.id));
  });
  const { msgs, custom, deleted } = tjEditCount();
  const dot = document.getElementById('tj-ed-dot');
  const count = document.getElementById('tj-ed-count');
  const parts = [];
  if (msgs > 0) parts.push(msgs + ' edited message' + (msgs === 1 ? '' : 's'));
  if (custom > 0) parts.push(custom + ' custom stage' + (custom === 1 ? '' : 's'));
  if (deleted > 0) parts.push(deleted + ' hidden stage' + (deleted === 1 ? '' : 's'));
  if (parts.length === 0) { dot.classList.remove('has-edits'); count.textContent = 'No changes yet'; }
  else { dot.classList.add('has-edits'); count.textContent = parts.join(' · '); }
}

/* ============================================================ */
/* Rendering                                                     */
/* ============================================================ */

function tjRenderPhases(){
  const el = document.getElementById('tj-phases');
  el.innerHTML = TJ_PHASES.map(p => {
    const left = tjPos(p.a), width = tjPos(p.b) - tjPos(p.a);
    return '<div class="phase-band ' + p.cls + '" style="left:' + left + '%; width:' + width + '%">' + p.name + '</div>';
  }).join('');
}

function tjRenderLane(targetId, stages, flow){
  const el = document.getElementById(targetId);
  const dotsHtml = stages.map(s => {
    const left = tjPos(s.day);
    const chips = s.ch.map(c => '<span class="ch-chip ' + c + '">' + c + '</span>').join('');
    return '<button class="dot tone-' + s.tone + '" style="left:' + left + '%" data-id="' + s.id + '" data-flow="' + flow + '" onclick="tjSelect(\'' + s.id + '\')" title="Day ' + s.day + ' · ' + tjEsc(s.title) + '"></button>' +
           '<div class="ch-stack" style="left:' + left + '%">' + chips + '</div>';
  }).join('');
  el.innerHTML = '<div class="lane-line"></div>' + dotsHtml;
}

function tjRenderAxis(){
  const el = document.getElementById('tj-axis');
  el.innerHTML = TJ_AXIS.map(d => '<span class="tick" style="left:' + tjPos(d) + '%">Day ' + d + '</span>').join('');
}

function tjRenderEvents(){
  const grid = document.getElementById('tj-events-grid');
  if (!grid) return;
  const events = tjGetEventStages();
  const chipHtml = events.map(ev => {
    const chips = ev.ch.map(c => '<span class="ch-chip ' + c + '">' + c + '</span>').join('');
    return '<button class="event-chip tone-' + ev.tone + '" data-id="' + ev.id + '" onclick="tjSelectEvent(\'' + ev.id + '\')">' +
             '<div class="event-chip-title">' + tjEsc(ev.title) + '</div>' +
             '<div class="event-chip-when">' + tjEsc(ev.when) + '</div>' +
             '<div class="event-chip-channels">' + chips + '</div>' +
           '</button>';
  }).join('');
  const addChip = '<button class="event-chip add-chip" onclick="tjOpenAddEventModal()">' +
                    '<div class="event-chip-title">+ Add event</div>' +
                    '<div class="event-chip-when">Create a new triggered event</div>' +
                  '</button>';
  grid.innerHTML = chipHtml + addChip;
  if (events.length > 0) tjSelectEvent(events[0].id);
  else tjClearEventDetail();
}

function tjClearEventDetail(){
  document.getElementById('tj-event-eyebrow').textContent = 'Triggered event';
  document.getElementById('tj-event-title').textContent = 'No events yet — click + Add event to create one';
  document.getElementById('tj-event-meta').innerHTML = '';
  document.getElementById('tj-event-body').textContent = '';
  document.getElementById('tj-event-messages').innerHTML = '';
}

/* ============================================================ */
/* Selection + editing wiring                                    */
/* ============================================================ */

function tjAttachEditors(container){
  container.querySelectorAll('[contenteditable="true"]').forEach(el => {
    el.addEventListener('blur', function(){
      tjSetOverride(this.dataset.stage, parseInt(this.dataset.idx, 10), this.dataset.field, this.innerText);
    });
    el.addEventListener('keydown', function(e){
      if (e.key === 'Escape') { e.preventDefault(); this.blur(); }
    });
  });
}

function tjSelect(id){
  document.querySelectorAll('.tj .dot').forEach(d => d.classList.toggle('selected', d.dataset.id === id));
  const stage = tjStageById(id);
  if (!stage) return;
  const flow = id.startsWith('nsf') ? 'NSF flow' : 'Non-NSF flow';
  document.getElementById('tj-eyebrow').textContent = flow + ' · Day ' + stage.day + ' · ' + stage.label;
  document.getElementById('tj-title').textContent = stage.title;
  const detail = document.getElementById('tj-detail');
  detail.classList.remove('tone-soft','tone-firm','tone-final');
  detail.classList.add('tone-' + stage.tone);
  const toneLabel = stage.tone === 'soft' ? 'Soft' : (stage.tone === 'firm' ? 'Firm' : 'Final');
  document.getElementById('tj-meta').innerHTML =
    '<span class="badge tone-' + stage.tone + '">' + toneLabel + '</span>' +
    '<span class="badge">' + tjEsc(stage.system) + '</span>' +
    '<button class="detail-remove" onclick="tjDeleteStage(\'' + stage.id + '\')" title="Remove this touchpoint">Remove</button>';
  document.getElementById('tj-body').textContent = stage.body;
  document.getElementById('tj-messages').innerHTML = stage.msgs.map((_, i) => {
    const m = tjEffectiveMsg(stage.id, i);
    const subj = m.subj
      ? '<div class="msg-subject" contenteditable="true" data-stage="' + stage.id + '" data-idx="' + i + '" data-field="subj" title="Click to edit">' + tjEsc(m.subj) + '</div>'
      : '';
    return '<div class="msg-row">' +
             '<div class="msg-channel">' + m.ch + '</div>' +
             subj +
             '<div class="msg-copy" contenteditable="true" data-stage="' + stage.id + '" data-idx="' + i + '" data-field="body" title="Click to edit">' + tjEsc(m.body) + '</div>' +
           '</div>';
  }).join('');
  tjAttachEditors(document.getElementById('tj-messages'));
}

function tjSelectEvent(id){
  document.querySelectorAll('.tj .event-chip').forEach(c => c.classList.toggle('selected', c.dataset.id === id));
  const ev = tjGetEventStages().find(e => e.id === id);
  if (!ev) return;
  const detail = document.getElementById('tj-event-detail');
  detail.classList.remove('tone-soft','tone-firm','tone-final');
  detail.classList.add('tone-' + ev.tone);
  const toneLabel = ev.tone === 'soft' ? 'Soft' : (ev.tone === 'firm' ? 'Firm' : 'Final');
  document.getElementById('tj-event-eyebrow').textContent = 'Triggered event · fires when: ' + ev.when;
  document.getElementById('tj-event-title').textContent = ev.title;
  document.getElementById('tj-event-meta').innerHTML =
    '<span class="badge tone-' + ev.tone + '">' + toneLabel + '</span>' +
    '<span class="badge">' + tjEsc(ev.system) + '</span>' +
    '<button class="detail-remove" onclick="tjDeleteStage(\'' + ev.id + '\')" title="Remove this event">Remove</button>';
  document.getElementById('tj-event-body').textContent = ev.body;
  document.getElementById('tj-event-messages').innerHTML = ev.msgs.map((_, i) => {
    const m = tjEffectiveMsg(ev.id, i);
    const subj = m.subj
      ? '<div class="msg-subject" contenteditable="true" data-stage="' + ev.id + '" data-idx="' + i + '" data-field="subj" title="Click to edit">' + tjEsc(m.subj) + '</div>'
      : '';
    return '<div class="msg-row">' +
             '<div class="msg-channel">' + m.ch + '</div>' +
             subj +
             '<div class="msg-copy" contenteditable="true" data-stage="' + ev.id + '" data-idx="' + i + '" data-field="body" title="Click to edit">' + tjEsc(m.body) + '</div>' +
           '</div>';
  }).join('');
  tjAttachEditors(document.getElementById('tj-event-messages'));
}

/* ============================================================ */
/* Toggles                                                       */
/* ============================================================ */

function tjSetView(view){
  const tj = document.querySelector('.tj');
  tj.classList.remove('view-both','view-timeline','view-events');
  tj.classList.add('view-' + view);
  document.querySelectorAll('.tj [data-view]').forEach(p => p.classList.toggle('active', p.dataset.view === view));
}

function tjSetFlow(flow){
  document.querySelectorAll('.tj .pill[data-flow]').forEach(p => p.classList.toggle('active', p.dataset.flow === flow));
  document.querySelectorAll('.tj .dot').forEach(d => {
    if (flow === 'both') d.style.opacity = '1';
    else d.style.opacity = d.dataset.flow.startsWith(flow) ? '1' : '0.25';
  });
}

/* ============================================================ */
/* Add / Remove stages                                           */
/* ============================================================ */

let tjModalMode = null;

function tjOpenAddEventModal(){
  tjModalMode = 'event';
  const modal = document.getElementById('tj-modal');
  modal.className = 'tj-modal mode-event';
  modal.hidden = false;
  document.getElementById('tj-modal-title').textContent = 'Add triggered event';
  document.getElementById('tj-modal-help').textContent = 'Triggered events fire any time the underlying condition is met — they sit outside the day-based timeline.';
  document.getElementById('tj-modal-submit').textContent = 'Add event';
  const form = document.getElementById('tj-modal-form');
  form.reset();
  form.elements.tone.value = 'soft';
  form.elements.ch_E.checked = true;
  setTimeout(() => form.elements.title.focus(), 50);
}

function tjOpenAddTimelineModal(){
  tjModalMode = 'timeline';
  const modal = document.getElementById('tj-modal');
  modal.className = 'tj-modal mode-timeline';
  modal.hidden = false;
  document.getElementById('tj-modal-title').textContent = 'Add timeline touchpoint';
  document.getElementById('tj-modal-help').textContent = 'A new touchpoint is added at the day you choose. You can edit the message copy inline after creating it.';
  document.getElementById('tj-modal-submit').textContent = 'Add touchpoint';
  const form = document.getElementById('tj-modal-form');
  form.reset();
  form.elements.tone.value = 'firm';
  form.elements.day.value = 28;
  form.elements.ch_E.checked = true;
  setTimeout(() => form.elements.title.focus(), 50);
}

function tjCloseModal(){
  document.getElementById('tj-modal').hidden = true;
  tjModalMode = null;
}

function tjModalSave(){
  const form = document.getElementById('tj-modal-form');
  const f = form.elements;
  const channels = [];
  if (f.ch_E.checked) channels.push('E');
  if (f.ch_S.checked) channels.push('S');
  if (f.ch_P.checked) channels.push('P');
  if (channels.length === 0) { alert('Please pick at least one channel.'); return; }
  if (!f.title.value.trim()) { alert('Title is required.'); return; }

  const msgs = channels.map(c => {
    const chName = c === 'E' ? 'Email' : (c === 'S' ? 'SMS' : 'Call');
    return {
      ch: chName,
      subj: c === 'E' ? '[Subject line — click to edit]' : '',
      body: '[' + chName + ' copy — click to edit]'
    };
  });

  const id = (tjModalMode === 'event' ? 'evt-' : (f.flow.value + '-')) + 'custom-' + Date.now();
  const stage = {
    id: id,
    tone: f.tone.value,
    ch: channels,
    system: f.system.value.trim() || 'Custom · manual',
    title: f.title.value.trim(),
    body: '[Internal description — what this touchpoint does and when. Customize freely.]',
    msgs: msgs,
    custom: true
  };

  const state = tjLoadState();
  if (tjModalMode === 'event') {
    stage.when = f.when.value.trim() || 'Custom trigger';
    state.custom.events.push(stage);
    tjSaveState(state);
    tjRenderEvents();
    tjRefreshEditedIndicators();
    tjSelectEvent(id);
  } else {
    stage.day = Math.max(0, Math.min(90, parseInt(f.day.value, 10) || 28));
    stage.label = f.label.value.trim() || 'custom';
    const flow = f.flow.value;
    state.custom[flow].push(stage);
    tjSaveState(state);
    tjRenderLane('tj-lane-' + flow, tjGetTimelineStages(flow), flow);
    tjRefreshEditedIndicators();
    tjSelect(id);
  }
  tjCloseModal();
}

function tjDeleteStage(id){
  const stage = tjStageById(id);
  if (!stage) return;
  const isCustom = tjIsCustomStage(id);
  const msg = isCustom
    ? 'Remove "' + stage.title + '"? This custom stage will be permanently deleted.'
    : 'Hide "' + stage.title + '"? It will be removed from view but can be restored with Reset all.';
  if (!confirm(msg)) return;

  const state = tjLoadState();
  if (isCustom) {
    state.custom.nsf = state.custom.nsf.filter(s => s.id !== id);
    state.custom.non = state.custom.non.filter(s => s.id !== id);
    state.custom.events = state.custom.events.filter(s => s.id !== id);
  } else {
    if (!state.deleted.includes(id)) state.deleted.push(id);
  }
  if (state.overrides[id]) delete state.overrides[id];
  tjSaveState(state);

  const isEvent = id.startsWith('evt-');
  if (isEvent) {
    tjRenderEvents();
  } else {
    const flow = id.startsWith('nsf-') ? 'nsf' : 'non';
    tjRenderLane('tj-lane-' + flow, tjGetTimelineStages(flow), flow);
    const stages = tjGetTimelineStages(flow);
    if (stages.length > 0) tjSelect(stages[0].id);
    else {
      const other = flow === 'nsf' ? 'non' : 'nsf';
      const otherStages = tjGetTimelineStages(other);
      if (otherStages.length > 0) tjSelect(otherStages[0].id);
    }
  }
  tjRefreshEditedIndicators();
}

/* ============================================================ */
/* Exports + reset                                               */
/* ============================================================ */

function tjDownload(filename, content, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
}

function tjExportJSON(){
  const state = tjLoadState();
  const payload = {
    exported_at: new Date().toISOString(),
    schema: 'trustly-return-recovery-state-v2',
    state: state,
    full_messages: {
      nsf: tjGetNSFStages().map(s => ({ id: s.id, day: s.day, label: s.label, title: s.title, tone: s.tone, custom: !!s.custom, msgs: s.msgs.map((_, i) => tjEffectiveMsg(s.id, i)) })),
      non: tjGetNONStages().map(s => ({ id: s.id, day: s.day, label: s.label, title: s.title, tone: s.tone, custom: !!s.custom, msgs: s.msgs.map((_, i) => tjEffectiveMsg(s.id, i)) })),
      events: tjGetEventStages().map(s => ({ id: s.id, when: s.when, title: s.title, tone: s.tone, custom: !!s.custom, msgs: s.msgs.map((_, i) => tjEffectiveMsg(s.id, i)) }))
    }
  };
  tjDownload('trustly-return-messages.json', JSON.stringify(payload, null, 2), 'application/json');
}

function tjExportMarkdown(){
  let md = '# Trustly Pay-by-Bank Return Recovery — Message Copy\n\n';
  md += '_Exported ' + new Date().toLocaleString() + '_\n\n';
  const sections = [
    { title: 'NSF flow (R01, R09)', stages: tjGetNSFStages() },
    { title: 'Non-NSF flow (R02–R29)', stages: tjGetNONStages() }
  ];
  sections.forEach(sec => {
    md += '## ' + sec.title + '\n\n';
    sec.stages.forEach(s => {
      md += '### Day ' + s.day + ' — ' + s.title + '\n';
      md += '_' + s.label + ' · tone: ' + s.tone + ' · system: ' + s.system + (s.custom ? ' · custom' : '') + '_\n\n';
      md += s.body + '\n\n';
      s.msgs.forEach((_, i) => {
        const m = tjEffectiveMsg(s.id, i);
        md += '**' + m.ch + '**' + (m.subj ? ' — _' + m.subj + '_' : '') + '\n\n';
        md += '> ' + m.body.replace(/\n/g, '\n> ') + '\n\n';
      });
      md += '---\n\n';
    });
  });
  md += '## Triggered events\n\n';
  tjGetEventStages().forEach(s => {
    md += '### ' + s.title + '\n';
    md += '_fires when: ' + s.when + ' · tone: ' + s.tone + ' · system: ' + s.system + (s.custom ? ' · custom' : '') + '_\n\n';
    md += s.body + '\n\n';
    s.msgs.forEach((_, i) => {
      const m = tjEffectiveMsg(s.id, i);
      md += '**' + m.ch + '**' + (m.subj ? ' — _' + m.subj + '_' : '') + '\n\n';
      md += '> ' + m.body.replace(/\n/g, '\n> ') + '\n\n';
    });
    md += '---\n\n';
  });
  tjDownload('trustly-return-messages.md', md, 'text/markdown');
}

function tjExportHTML(){
  const state = tjLoadState();
  const initJS = 'try{localStorage.setItem(' + JSON.stringify(TJ_STORAGE_KEY) + ',' + JSON.stringify(JSON.stringify(state)) + ');}catch(e){}';
  const initTag = '<scr' + 'ipt>' + initJS + '</scr' + 'ipt>';
  const html = document.documentElement.outerHTML.replace(/<\/head>/i, initTag + '</head>');
  tjDownload('trustly-return-recovery-journey-edited.html', '<!DOCTYPE html>\n' + html, 'text/html');
}

function tjResetAll(){
  if (!confirm('Reset everything to defaults? All edits, custom stages, and hidden stages will be cleared.')) return;
  try {
    localStorage.removeItem(TJ_STORAGE_KEY);
    localStorage.removeItem(TJ_LEGACY_KEY);
  } catch(e){}
  tjRenderLane('tj-lane-nsf', tjGetNSFStages(), 'nsf');
  tjRenderLane('tj-lane-non', tjGetNONStages(), 'non');
  tjRenderEvents();
  tjRefreshEditedIndicators();
  const first = tjGetNSFStages()[0];
  if (first) tjSelect(first.id);
}

/* ============================================================ */
/* Init                                                          */
/* ============================================================ */

document.addEventListener('DOMContentLoaded', function(){
  tjSetView('both');
  tjRenderPhases();
  tjRenderLane('tj-lane-nsf', tjGetNSFStages(), 'nsf');
  tjRenderLane('tj-lane-non', tjGetNONStages(), 'non');
  tjRenderAxis();
  tjRenderEvents();
  tjRefreshEditedIndicators();
  const firstNSF = tjGetNSFStages()[0];
  if (firstNSF) tjSelect(firstNSF.id);

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && !document.getElementById('tj-modal').hidden) tjCloseModal();
  });
});
