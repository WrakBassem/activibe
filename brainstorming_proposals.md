# Next Feature Proposals

Now that the core RPG loop is built (Daily Logs -> XP/Levels -> Gold/Items -> Boss Fights -> Black Market), we can take the platform in several exciting directions. 

Here are the top three feature concepts that naturally build on our current architecture:

## 1. Character Class System (The most requested!)
**Concept**: Allow the user to pick a "Class" (e.g., The Scholar, The Athlete, The Monk) when they reach Level 5.
- **Mechanics**: Each class grants permanent passive bonuses tailored to specific playstyles.
    - *The Scholar*: +20% XP gained from "Mind" or "Intellect" related metrics.
    - *The Athlete*: +20% damage dealt to bosses from "Health" or "Strength" related metrics.
    - *The Monk*: Streak Freezes cost 50% less Gold in the Black Market.
- **UI Element**: A beautifully designed "Skill Tree" or "Class Selection" page with class avatars, integrated into the `user_attributes` table we've already started.

## 2. Dynamic Shop Events & "The Smuggler"
**Concept**: Expand the Black Market from a static store into a dynamic, daily habit driver.
- **Mechanics**: Introduce a rotating "Daily Deal" or a randomly appearing "Smuggler" who offers high-rarity items at a steep discount, but only for 24 hours.
- **Items**: Introduce consumable items that actually *affect* the UI. For example, a "Smoke Bomb" item that temporarily hides all your negative scores for 24 hours, or a "Time Turner" that lets you retroactively edit a missed log from yesterday.

## 3. The "World Boss" & Social Accountability
**Concept**: If this app is ever used by multiple people (or if we want to simulate a living world), we can introduce massive "World Bosses."
- **Mechanics**: A boss with 10,000 HP appears for the entire weekend. *Every* user's perfect logs and Focus Forge sessions contribute to a global damage pool.
- **Rewards**: If the community kills the boss before Monday, everyone gets a piece of legendary loot and a unique Title (handled in our existing `titles` array).

Let me know which of these 3 paths sounds the most exciting to you!
