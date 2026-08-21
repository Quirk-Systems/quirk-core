#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json
from pathlib import Path
from jsonschema import Draft202012Validator
ROOT=Path(__file__).resolve().parent
T=json.loads((ROOT/"TRANCHE.json").read_text())
F=json.loads((ROOT/"fixtures.json").read_text())

def semantic(cid,x):
    e=[]
    if cid=="contract_000":
        f=x.get("fixtures",{})
        if x.get("status")=="frozen" and any(not f.get(k) for k in ("positive","negative","adversarial","exemplar")): e.append("frozen contract requires all four fixture classes")
    elif cid=="contract_005":
        if x.get("result")=="success" and not x.get("authority"): e.append("successful execution requires explicit authority")
    elif cid=="contract_006":
        if x.get("sideEffects") and not x.get("authorityRequirements"): e.append("side-effecting capability requires authority")
        if x.get("sideEffects") and not x.get("receiptRequired"): e.append("side-effecting capability requires receipt")
    elif cid=="contract_007":
        if x.get("state") in ("authorized","executing","completed") and not x.get("authorityRefs"): e.append("active action state requires authority")
        if x.get("state")=="completed" and not x.get("receiptRef"): e.append("completed action requires receipt")
    elif cid=="contract_008":
        if x.get("qualityMode") in ("ship","exemplar") and not x.get("requirements"): e.append("ship/exemplar output requires requirements")
    elif cid=="contract_009":
        if x.get("status")=="evidenced" and not x.get("links",{}).get("evidence"): e.append("evidenced requirement requires evidence")
        if x.get("status")=="waived" and not x.get("waiverReason"): e.append("waived requirement requires reason")
    elif cid=="contract_010":
        if x.get("state")=="verified-complete":
            if x.get("openItems"): e.append("verified-complete cannot have open items")
            if any(not c.get("satisfied") for c in x.get("criteria",[])): e.append("verified-complete requires satisfied criteria")
            if not x.get("evidence"): e.append("verified-complete requires evidence")
    elif cid=="contract_011":
        if x.get("verdict")=="pass" and not x.get("evidence"): e.append("pass requires evidence")
    elif cid=="contract_012":
        if x.get("selfDeclared") is not False: e.append("quality may not be self-declared")
        if x.get("level")=="Q11" and not x.get("distinctiveAdvantage"): e.append("Q11 requires distinctive advantage")
        if any(not d.get("met") for d in x.get("dimensions",[])): e.append("quality level requires dimensions met")
    return e

def main():
    schemas={}
    for c in T["contracts"]:
        schemas[c["id"]]=json.loads((ROOT/c["schema"]).read_text())
    raw={"tranche":{**T,"metadata":{k:v for k,v in T["metadata"].items() if k!="frozenDigest"}},"schemas":schemas,"fixtures":F}
    digest="sha256:"+hashlib.sha256(json.dumps(raw,sort_keys=True,separators=(",",":")).encode()).hexdigest()
    if digest!=T["metadata"]["frozenDigest"]:
        print("FAIL frozen digest mismatch"); return 1
    mismatches=[]
    for c in T["contracts"]:
        cid=c["id"]; validator=Draft202012Validator(schemas[cid])
        for cls,expected in c["expected"].items():
            obj=dict(F[cid][cls]); obj.pop("_fixture_note",None)
            structural=[e.message for e in validator.iter_errors(obj)]
            errors=structural or semantic(cid,obj)
            actual="fail" if errors else "pass"
            print(f"{cid} {cls:11} expected={expected.upper()} actual={actual.upper()}")
            if actual!=expected: mismatches.append((cid,cls,expected,actual,errors))
    print(f"fixture cases=36 mismatches={len(mismatches)}")
    if mismatches:
        print(json.dumps(mismatches,indent=2)); return 1
    print("PASS frozen-contracts-v0.2"); return 0
if __name__=="__main__": raise SystemExit(main())
