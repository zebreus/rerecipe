"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Target,
  Leaf,
  FlaskConical,
  ListChecks,
  TestTube,
  BarChart3,
  ArrowRight,
} from "lucide-react";

const STEPS = [
  {
    icon: Target,
    title: "1. Define Your Target Product",
    description:
      "Start by describing the product you want to reverse-engineer. Set its name, target mass, and estimated composition (water, fat, protein, sugar, etc.).",
    tips: [
      "Use nutrition labels as a starting point for composition",
      "Take detailed notes on texture and appearance",
      "Composition percentages should sum to ~100%",
    ],
  },
  {
    icon: Leaf,
    title: "2. Build Your Ingredient Library",
    description:
      "Add all candidate ingredients with their nutritional composition. Include density, category, and source information for traceability.",
    tips: [
      "Use supplier data sheets for accurate composition",
      "Set confidence levels to track data quality",
      "Track cost per kg for formula costing",
    ],
  },
  {
    icon: FlaskConical,
    title: "3. Create Candidate Formulas",
    description:
      "Build formulas by selecting ingredients and specifying masses. Use the auto-generate feature to create a starting formula from your target composition, then refine.",
    tips: [
      "Use the composition comparison chart to see gaps vs target",
      "Lock ingredient lines you don't want the solver to change",
      "Try sensitivity analysis to understand impact of changes",
    ],
  },
  {
    icon: ListChecks,
    title: "4. Design Manufacturing Protocols",
    description:
      "Define step-by-step manufacturing procedures. Specify temperatures, durations, agitation levels, and ingredient additions for each step.",
    tips: [
      "Start with standard methods (batch cook, hot fill)",
      "Document hold conditions carefully",
      "Note expected effects and risk flags per step",
    ],
  },
  {
    icon: TestTube,
    title: "5. Run and Log Trials",
    description:
      "Execute experiments by combining a formula with a protocol. Record observations, measurements, and score each quality dimension.",
    tips: [
      "Change only one variable at a time between trials",
      "Record actual parameters, not just planned ones",
      "Use the scoring rubric consistently across trials",
    ],
  },
  {
    icon: BarChart3,
    title: "6. Analyze and Iterate",
    description:
      "Use the analysis page to compare trials, track progression, and get evidence-based recommendations for your next iteration.",
    tips: [
      "Check the Evidence & Reasoning tab for actionable insights",
      "Compare formulas side-by-side to spot composition gaps",
      "Duplicate your best formula and make targeted adjustments",
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Getting Started
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Learn how to use the Recipe Reverse Engineering Suite step by step.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            This tool helps you systematically reverse-engineer food products.
            Follow the six-step workflow below to go from a target product to a
            close-matching clone through iterative experimentation.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {STEPS.map((step, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <step.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {step.description}
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Tips
                </p>
                <ul className="space-y-1">
                  {step.tips.map((tip, i) => (
                    <li
                      key={i}
                      className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5"
                    >
                      <ArrowRight className="h-3 w-3 mt-0.5 text-indigo-400 shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Personas &amp; Example Use Cases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">1. Sarah Chen — Food Scientist at a Startup</h3>
            <p>Sarah works at an alternative dairy startup. She needs to reverse-engineer a competitor&apos;s oat milk yogurt to understand its formulation—specifically the ratio of oat base, starches, and hydrocolloids that achieve the target viscosity and mouthfeel. She defines the competitor product as her target, adds oat base, tapioca starch, pectin, and cultures as ingredients, then iterates through formulas using the sensitivity analysis to nail down the hydrocolloid ratio.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">2. Marcus Webb — R&amp;D Manager at a Mid-Size Food Company</h3>
            <p>Marcus oversees a team of 5 food technologists working on multiple product lines. He uses the tool to track all active reverse-engineering projects, compare trial results across team members, and make data-driven decisions about which formula candidates to advance to pilot production. He relies heavily on the analysis page&apos;s ranking and evidence reasoning to justify decisions to leadership.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">3. Dr. Priya Patel — Academic Researcher</h3>
            <p>Priya studies traditional Indian dairy sweets for her food science research. She documents traditional recipes by defining them as target products, then systematically tests modernized formulations using different milk powders and sugar sources. She exports her data for inclusion in research papers and uses the protocol documentation to ensure reproducibility.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">4. Jake Morrison — Home Chef &amp; Food Blogger</h3>
            <p>Jake tries to recreate restaurant dishes at home. He starts with rough guesses for composition based on tasting notes, adds common pantry ingredients, and iterates. He uses the mobile-friendly interface on his phone in the kitchen, taking notes during each trial and comparing results to find the closest match to the original dish.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">5. Emma Larsson — Quality Control Manager</h3>
            <p>Emma ensures production batches match the reference specification. She defines the reference product as the target, logs each production batch as a trial, and uses the composition comparison charts to spot deviations. The scoring system helps her quantify quality drift and decide when corrective action is needed.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">6. Roberto Silva — Artisan Chocolate Maker</h3>
            <p>Roberto is developing a new line of filled chocolates. He uses the tool to systematically adjust ganache formulations—varying the cocoa butter, cream, and flavoring ratios. The ingredient contribution heatmap helps him visualize fat distribution, and he duplicates promising formulas to create small variations for blind tastings.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">7. Dr. Yuki Tanaka — Sensory Scientist</h3>
            <p>Yuki designs structured sensory evaluations. She customizes the scoring profiles with dimensions like &quot;creaminess,&quot; &quot;sweetness intensity,&quot; &quot;astringency,&quot; and &quot;aftertaste.&quot; She runs triangle tests as trials, carefully logging panelist scores and observations, then uses the radar charts and analysis tools to identify which formula dimensions need adjustment.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">8. Linda Hoffmann — Regulatory Affairs Specialist</h3>
            <p>Linda needs to verify ingredient declarations match actual formulations. She enters the declared composition as the target, adds each declared ingredient with its known composition, and builds the formula to check that the mass balance and component percentages align with label claims. Discrepancies flag potential compliance issues.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">9. Tom O&apos;Brien — Production Engineer</h3>
            <p>Tom designs and optimizes manufacturing processes. He creates detailed protocols with precise temperature ramps, hold times, and agitation parameters. He runs trials at different scales (lab, pilot, production) and compares results to identify process parameters that cause quality deviations during scale-up.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">10. Anika Johansson — Product Development Intern</h3>
            <p>Anika is new to food science and uses the Getting Started guide to learn the reverse-engineering methodology. She follows the step-by-step workflow, starting with a simple target (recreating a commercial smoothie). The tool&apos;s structure teaches her to think systematically about formulation—defining targets, building ingredient libraries, and iterating based on evidence rather than intuition.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
