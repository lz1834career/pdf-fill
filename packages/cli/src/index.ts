#!/usr/bin/env node
import { Command } from "commander";
import { registerListCommand } from "./commands/list.js";
import { registerDoctorCommand } from "./commands/doctor.js";
import { registerFillCommand } from "./commands/fill.js";
import { registerScaffoldCommand } from "./commands/scaffold.js";
import { registerVerifyCommand } from "./commands/verify.js";
import { registerBatchCommand } from "./commands/batch.js";
import { registerRunCommand } from "./commands/run.js";
import { registerDiffCommand } from "./commands/diff.js";

const program = new Command();

program
  .name("pdffill")
  .description("List, diagnose, and fill PDF AcroForms (pdf-lib, no pdftk)")
  .version("0.6.0");

registerListCommand(program);
registerDoctorCommand(program);
registerFillCommand(program);
registerScaffoldCommand(program);
registerVerifyCommand(program);
registerBatchCommand(program);
registerRunCommand(program);
registerDiffCommand(program);

program.parse();
