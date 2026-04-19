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
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">11. David Kim — ADHD Food Scientist</h3>
            <p>David has ADHD and works best when he can jump rapidly between different aspects of a project. He loves that every formula, protocol, and trial name throughout the app is a clickable link—so when he spots &quot;Candidate A&quot; mentioned in a trial result, he can instantly jump to the formula detail, check the heatmap, come back, and compare with a different trial. The cross-linked navigation between sections lets him follow his train of thought without losing context. He relies heavily on the dashboard for a quick overview, the sidebar for instant section switching, and the related trials panels on formula and protocol pages to keep track of connections.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">12. Fatima Al-Rashidi — Kosher/Halal Compliance Consultant</h3>
            <p>Fatima audits food products for religious dietary compliance. She uses the ingredient library to flag potential non-compliant ingredients (e.g., gelatin sources, alcohol-based extracts), then traces them through every formula that uses them. The ingredient contribution heatmap helps her quickly spot which formulas contain concerning components, and the protocol steps let her verify that manufacturing processes don&apos;t introduce cross-contamination risks.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">13. Liam O&apos;Connor — Craft Brewery Owner</h3>
            <p>Liam reverse-engineers competitor craft beers to develop his own signature brews. He defines target beers by their flavor profiles and estimated malt/hop/yeast ratios, then designs brewing protocols with precise temperature ramps and fermentation schedules. He runs multiple small-batch trials, scoring each on bitterness, body, aroma, and clarity, then uses the analysis radar charts to compare batches and the progression charts to track how his recipes improve over brewing iterations.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">14. Nina Petrov — Allergen Safety Manager</h3>
            <p>Nina manages allergen safety across a multi-product facility. She creates separate projects for each product line, using the target composition to define allergen-free specifications. She meticulously documents every ingredient&apos;s allergen status in the notes field, builds formulas that avoid the &quot;Big 9&quot; allergens, and uses the compliance check to verify that no formula exceeds safe thresholds. The JSON export feature lets her archive validated formulations for regulatory submissions.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">15. Chen Wei — Pet Food Formulator</h3>
            <p>Wei develops premium pet food at a startup. He reverse-engineers competitor products by analyzing guaranteed analysis panels (protein, fat, fiber, moisture) as his target composition. He builds ingredient libraries of animal proteins, grains, and supplements, then uses the solver to find optimal blends that meet AAFCO nutritional standards. The sensitivity analysis helps him understand how swapping chicken meal for fish meal affects the overall nutritional profile.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">16. Isabelle Dubois — Pastry Competition Coach</h3>
            <p>Isabelle coaches a team preparing for international pastry competitions. She uses the tool to systematically perfect each component of complex desserts—ganache fillings, mousse layers, sponge bases, and glaze coatings. Each component gets its own formula, and she creates protocols for assembly sequences with precise timing and temperatures. The scoring profiles are customized for competition criteria: visual presentation, texture, flavor balance, and technical execution. She exports completed projects as reference archives for future competition teams.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">17. Marco Rossi — Test Cook (Process Optimization)</h3>
            <p>Marco is a test cook at a food R&amp;D lab who runs structured process comparisons. For each product iteration, he creates multiple manufacturing protocols (e.g., stovetop vs. pressure cooker vs. sous vide) and then runs exactly three trial replicates per protocol to assess reproducibility. He relies on the protocol page to define distinct processes, creates separate trials linking the same formula to each protocol, and uses the analysis ranking and radar charts to compare outcomes across processes. The trial progression view helps him see whether scores are converging (good reproducibility) or diverging (process instability). He needs to quickly navigate between protocols and their related trials, and uses the side-by-side comparison to ensure that his three replicates per process are consistent before recommending a process for scale-up.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">18. Dr. Amara Okafor — Process Development Lead (In-Depth Trial Analysis &amp; Protocol Iteration)</h3>
            <p>Dr. Amara Okafor leads process development at a mid-size dairy company and specializes in deep-dive analysis of trial replicates to drive protocol improvements. Her workflow begins by filtering the trial list and analysis views to a single protocol (e.g., &quot;Standard Batch Cook&quot;) to focus on its three replicates. She examines each trial&apos;s scoring dimensions, observations, and measurements individually, then uses the Score Radar tab to overlay all three replicates and identify which quality dimensions show the most variance—indicating process instability. She cross-references the Deviations tab on each trial to check composition drift, reviews the Trial Progression chart filtered by protocol to confirm score trends, and reads the Evidence &amp; Reasoning tab for data-driven improvement suggestions. Based on her analysis, she duplicates the best-performing protocol, modifies specific parameters (e.g., extending cook time by 2 minutes, lowering hold temperature by 5°C), and creates a new iteration. She then runs three new trials against the iterated protocol, repeating her deep analysis cycle until scores consistently exceed her 75% threshold. She relies on the protocol filter on the analysis and trials pages to quickly switch between process versions, and the selectable Score Radar to compare replicates within and across protocol versions.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
