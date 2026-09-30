# Vehicular Mobility Model

## 1. Kinematic Inputs
For each vehicle $i$, the RSU tracks:
- Spatial Position: $P_i = (x_i, y_i)$
- Velocity Vector: $V_i = (v_{xi}, v_{yi})$, speed $s_i = \sqrt{v_{xi}^2 + v_{yi}^2}$
- Direction / Heading: $\theta_i \in [0, 360)$
- RSU Cell Center: $P_{\text{RSU}} = (x_r, y_r)$, Cell Radius $R = 400\text{m}$

---

## 2. Distance to Boundary & Heading Vector
The Euclidean distance from vehicle to RSU center is:

$$d_i = \|P_i - P_{\text{RSU}}\|$$

The remaining distance to the circular boundary perimeter:

$$d_{\text{boundary}} = \max(0, R - d_i)$$

The normalized radial direction vector from center to vehicle is:

$$\hat{r} = \frac{P_i - P_{\text{RSU}}}{\|P_i - P_{\text{RSU}}\| + \epsilon}$$

The unit velocity vector is $\hat{v} = (\cos \theta, \sin \theta)$. The outward projection factor is:

$$\text{dot}_{\text{outward}} = \hat{v} \cdot \hat{r} \in [-1, 1]$$

---

## 3. Normalized Mobility Score
$$\text{Mobility Score} = w_{\text{prox}} \cdot \left(\frac{d_i}{R}\right) + w_{\text{speed}} \cdot \left(\frac{s_i}{s_{\max}}\right) + w_{\text{dir}} \cdot \left(\frac{\text{dot}_{\text{outward}} + 1}{2}\right)$$

Where:
- $w_{\text{prox}} = 0.45, w_{\text{speed}} = 0.30, w_{\text{dir}} = 0.25$
- $s_{\max} = 120\text{ km/h}$

---

## 4. Handover Probability
$$\text{Handover Probability} = \left(\frac{d_i}{R}\right) \cdot \left(\frac{\text{dot}_{\text{outward}} + 1}{2}\right) \cdot \left(0.5 + 0.5 \frac{s_i}{s_{\max}}\right)$$

Vehicles with $\text{Mobility Score} \ge 0.75$ or $\text{Handover Probability} \ge 0.70$ are flagged as imminent boundary transitions, prompting the MT-AGKM **PREPARE** decision.
