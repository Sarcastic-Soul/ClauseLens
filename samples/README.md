# Sample documents

Five synthetic documents used to exercise the analyser. **None of these are real
agreements and none contain personal data**, which is why they can live in a public
repository.

| File | What it is | Why it is here |
|---|---|---|
| `residential-rent-agreement.pdf` | 11-month leave and licence agreement, Bengaluru | The main demo document. Carries a 10-month deposit, a 6-month lock-in, sole-discretion deduction, and repairs pushed onto the licensee |
| `residential-rent-agreement-fair.pdf` | The same kind of agreement, drafted fairly | The counterpart for compare mode: 2-month deposit against 10, mutual lock-in, repairs on the landlord, itemised deductions. Comparing the two makes the difference legible |
| `employment-offer-letter.pdf` | Offer letter with probation and clawback | Different clause vocabulary — notice period, 24-month joining-bonus clawback, broad IP assignment, 12-month non-compete |
| `freelance-services-agreement.pdf` | Contractor agreement, Mumbai | Unlimited revisions, 60-day payment terms, uncapped indemnity, portfolio use blocked |
| `not-a-contract-recipe.pdf` | A recipe | Edge case: the analyser must report `unrecognised` rather than inventing clauses |

The PDFs are generated into `public/samples/` so the deployed app can offer them as
one-click examples. Regenerate them from the HTML sources in this directory with:

```bash
./scripts/build-samples.sh   # requires LibreOffice
```

Real documents used for prompt tuning are kept in `private-samples/`, which is
git-ignored and never committed.
