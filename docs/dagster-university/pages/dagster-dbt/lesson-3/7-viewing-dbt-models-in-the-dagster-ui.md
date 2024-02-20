---
title: 'Lesson 3: Viewing dbt models in the Dagster UI'
module: 'dagster_dbt'
lesson: '3'
---

# Viewing dbt models in the Dagster UI

Once all the work above has been done, you’re ready to see your dbt models represented as assets! Here’s how you can find your models:

1. Run `dagster dev` and navigate to the asset graph.
2. Expand the `default` group in the asset graph.
3. You should see your two dbt models, `stg_trips` and `stg_zones`, converted as assets within your Dagster project!

   ![todo]()

If you’re familiar with the Dagster metadata system, you’ll notice that the descriptions you defined for the dbt models in `staging.yml` are carried over as those for your dbt models. In this case, your `stg_zones`'s description would say _“The taxi zones, with enriched records and additional flags”._

And, of course, the orange dbt logo attached to the assets indicates that they are dbt models.

Click the `stg_trips` node on the asset graph and look at the right sidebar. You’ll get some metadata out-of-the-box, such as the dbt code used for the model, how long the model takes to materialize over time, and the schema of the model.

![TODO]()

---

## Running dbt models with Dagster

After clicking around a bit and seeing the dbt models within Dagster, the next step is to materialize them.

1. Click the `stg_zones` asset.
2. Hold **Command** (or **Control** on Windows/Linux) and click the `stg_trips` asset.
3. Click the **Materialize selected** button toward the top-right section of the asset graph.
4. Click the toast notification at the top of the page (or the hash that appears at the bottom right of a dbt asset’s node) to navigate to the run.

After doing so, the run’s page should look similar to this:

![TODO]()

Notice that there is only one “block,” or step, in this chart. That’s because Dagster runs dbt as it’s intended to be run: in a single execution of a `dbt` CLI command. This step will be named after the `@dbt_assets` -decorated asset, which we called `dbt_analytics` in the `assets/dbt.py` file.

Scrolling through the logs, you’ll see the dbt commands Dagster executes, along with each model materialization. We want to point out two note-worthy logs:

{% table %}

- Identifying dbt commands

---

- {% width="60%" %}
  The log statement that indicates what dbt command is being run. Note that this executed the dbt run that specified in the `dbt_analytics` asset.

- ![TODO - update image](/images/dagster-essentials/lesson-3/assets-overview.png) {% rowspan=2 %}

{% /table %}

{% table %}

- Materialization events

---

- {% width="60%" %}
  The asset materialization events indicating that `stg_zones` and `stg_trips` were successfully materialized during the dbt execution.

- ![TODO - update image](/images/dagster-essentials/lesson-3/assets-overview.png) {% rowspan=2 %}

{% /table %}

{% callout %}
> 💡 **What’s `--select fqn:*`?** As mentioned earlier, Dagster tries to run dbt in as few executions as possible. `fqn` is a [dbt selection method](https://docs.getdbt.com/reference/node-selection/methods#the-fqn-method) that is as explicit as it gets and matches the node names in a `manifest.json`. The `*` means it will run all dbt models.
{% /callout %}

Try running just one of the dbt models and see what happens! Dagster will dynamically generate the `--select` argument based on the assets selected to run.