import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** Minimal template: three text fields */
export async function createSimpleTextFixture(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 200]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();

  const a = form.createTextField("first_name");
  a.setText("");
  a.addToPage(page, { x: 50, y: 150, width: 200, height: 20, font });

  const b = form.createTextField("last_name");
  b.setText("");
  b.addToPage(page, { x: 50, y: 120, width: 200, height: 20, font });

  const c = form.createTextField("email");
  c.setText("");
  c.addToPage(page, { x: 50, y: 90, width: 200, height: 20, font });

  page.drawText("Sample form", { x: 50, y: 170, size: 12, font, color: rgb(0, 0, 0) });

  return doc.save();
}

/** Template with checkbox + radio */
export async function createCheckboxRadioFixture(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 220]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();

  const agree = form.createCheckBox("agree_terms");
  agree.addToPage(page, { x: 50, y: 150, width: 18, height: 18 });

  const plan = form.createRadioGroup("plan");
  plan.addOptionToPage("basic", page, { x: 50, y: 110, width: 18, height: 18 });
  plan.addOptionToPage("pro", page, { x: 50, y: 80, width: 18, height: 18 });

  page.drawText("Terms + plan", { x: 50, y: 180, size: 12, font, color: rgb(0, 0, 0) });

  return doc.save();
}

/**
 * Multi-page template: dotted field names, read-only, multiline,
 * checkbox, radio, dropdown — for integration / manual testing.
 */
export async function createComplexFixture(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("pdffill complex fixture");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const form = doc.getForm();

  // --- Page 1: applicant ---
  const p1 = doc.addPage([595, 420]);
  p1.drawText("Page 1 — Applicant (pdffill complex fixture)", {
    x: 40,
    y: 390,
    size: 14,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  const ref = form.createTextField("reference_no");
  ref.setText("REF-2026-0001");
  ref.enableReadOnly();
  ref.addToPage(p1, { x: 140, y: 350, width: 200, height: 18, font });
  p1.drawText("Reference (read-only):", { x: 40, y: 352, size: 10, font });

  const applicantName = form.createTextField("applicant.name");
  applicantName.setText("");
  applicantName.addToPage(p1, { x: 140, y: 310, width: 280, height: 20, font });
  p1.drawText("Name:", { x: 40, y: 312, size: 10, font });

  const applicantId = form.createTextField("applicant.id_number");
  applicantId.setText("");
  applicantId.addToPage(p1, { x: 140, y: 270, width: 200, height: 20, font });
  p1.drawText("ID:", { x: 40, y: 272, size: 10, font });

  const department = form.createTextField("department");
  department.setText("");
  department.addToPage(p1, { x: 140, y: 230, width: 200, height: 20, font });
  p1.drawText("Department:", { x: 40, y: 232, size: 10, font });

  const startDate = form.createTextField("start_date");
  startDate.setText("");
  startDate.addToPage(p1, { x: 140, y: 190, width: 120, height: 20, font });
  p1.drawText("Start date:", { x: 40, y: 192, size: 10, font });

  const reason = form.createTextField("reason_multiline");
  reason.enableMultiline();
  reason.setText("");
  reason.addToPage(p1, { x: 140, y: 100, width: 400, height: 70, font });
  p1.drawText("Reason:", { x: 40, y: 150, size: 10, font });

  const amount = form.createTextField("budget_amount");
  amount.setText("");
  amount.addToPage(p1, { x: 140, y: 60, width: 120, height: 20, font });
  p1.drawText("Budget:", { x: 40, y: 62, size: 10, font });

  // --- Page 2: options & approval ---
  const p2 = doc.addPage([595, 420]);
  p2.drawText("Page 2 — Options & approval", {
    x: 40,
    y: 390,
    size: 14,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  const urgent = form.createCheckBox("is_urgent");
  urgent.addToPage(p2, { x: 180, y: 340, width: 18, height: 18 });
  p2.drawText("Urgent request", { x: 40, y: 342, size: 10, font });

  const notify = form.createCheckBox("notify_email");
  notify.check();
  notify.addToPage(p2, { x: 180, y: 300, width: 18, height: 18 });
  p2.drawText("Send email notification (default checked)", {
    x: 40,
    y: 302,
    size: 10,
    font,
  });

  const workspace = form.createRadioGroup("workspace_type");
  workspace.addOptionToPage("desk", p2, { x: 50, y: 250, width: 16, height: 16 });
  workspace.addOptionToPage("hotdesk", p2, { x: 50, y: 220, width: 16, height: 16 });
  workspace.addOptionToPage("remote", p2, { x: 50, y: 190, width: 16, height: 16 });
  p2.drawText("Workspace: desk / hotdesk / remote", { x: 80, y: 255, size: 10, font });

  const priority = form.createDropdown("priority");
  priority.addOptions(["low", "normal", "high", "critical"]);
  priority.addToPage(p2, { x: 140, y: 140, width: 140, height: 22, font });
  p2.drawText("Priority:", { x: 40, y: 142, size: 10, font });

  const approver = form.createTextField("approver_name");
  approver.setText("");
  approver.addToPage(p2, { x: 140, y: 90, width: 200, height: 20, font });
  p2.drawText("Approver:", { x: 40, y: 92, size: 10, font });

  const signed = form.createCheckBox("supervisor_signed");
  signed.addToPage(p2, { x: 180, y: 50, width: 18, height: 18 });
  p2.drawText("Supervisor signed", { x: 40, y: 52, size: 10, font });

  return doc.save();
}
