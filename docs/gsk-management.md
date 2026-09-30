# Group Session Key (GSK) Management

## 1. Overview
Within each Fog / RSU coverage cell, vehicles participate in secure V2V and V2I group communication using a shared cell Group Session Key (GSK). The key is represented as:

$$\text{GSK} \in \{0, 1\}^{256}$$

The RSU maintains version lineage: `v1, v2, v3, ...`

---

## 2. Backward Security
**Definition:** A newly joined vehicle must not be capable of decrypting or reading past group messages broadcast before its admission.

**Mechanism:** When vehicle $V_{\text{new}}$ is verified and admitted into the cell group:
1. Current $\text{GSK}_{v}$ is invalidated and marked `SUPERSEDED`.
2. Fresh 256-bit key material $\text{GSK}_{v+1}$ is generated.
3. $\text{GSK}_{v+1}$ is distributed securely to all current members plus $V_{\text{new}}$ using their respective unicast pairwise session keys.
4. $V_{\text{new}}$ possesses only $\text{GSK}_{v+1}$ and possesses zero access to $\text{GSK}_{v}$.

---

## 3. Forward Security
**Definition:** A vehicle that leaves the cell or is revoked must not be capable of decrypting future group transmissions.

**Mechanism:** When vehicle $V_{\text{dep}}$ departs the RSU boundary or is revoked due to low trust:
1. Current $\text{GSK}_{v}$ is invalidated.
2. Fresh key $\text{GSK}_{v+1}$ is generated.
3. $V_{\text{dep}}$ is excluded from the authorized member set.
4. $\text{GSK}_{v+1}$ is encrypted and dispatched only to authorized remaining members.
