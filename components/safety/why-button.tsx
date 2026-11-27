"use client";

import { WHY_EVENT } from "./host";

export function WhyButton() {
  return <button type="button" className="linkbtn" onClick={() => window.dispatchEvent(new Event(WHY_EVENT))}>What’s limited and why</button>;
}
