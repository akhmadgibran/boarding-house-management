/**
 * Passenger Entry Point for cPanel
 * 
 * cPanel's Phusion Passenger requires an `app.js` in the application root
 * as the startup file. This file simply bootstraps the compiled TypeScript
 * output from the `dist/` directory.
 */
require("dotenv").config();
require("./dist/index.js");
