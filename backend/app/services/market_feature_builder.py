"""
MarketFeatureBuilder – shared between training and inference.

Must live in its own module so joblib can unpickle model_metadata.joblib
regardless of whether train.py or run.py is the process entry point.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


class MarketFeatureBuilder:

    def __init__(self):

        self.locality_stats = {}
        self.locality_bhk_stats = {}
        self.locality_type_stats = {}

        self.region_stats = {}
        self.region_bhk_stats = {}

        self.global_ppsf = None

    # --------------------------------------------------------

    @staticmethod
    def _weighted_median(values):

        values = np.asarray(values)

        if len(values) == 0:
            return np.nan

        return float(
            np.median(values)
        )

    # --------------------------------------------------------

    def fit(self, df):

        work = df.copy()

        work["PPSF"] = (
            work["Price_Lakhs"] * 100000.0
            / work["Area_SqFt"].clip(lower=1)
        )

        self.global_ppsf = float(
            work["PPSF"].median()
        )

        # ----------------------------------------------------
        # Locality
        # ----------------------------------------------------

        locality_group = (
            work.groupby("Locality")["PPSF"]
        )

        locality_median = (
            locality_group.median()
        )

        locality_count = (
            locality_group.count()
        )

        for locality in locality_median.index:

            self.locality_stats[
                locality
            ] = {
                "median": float(
                    locality_median.loc[locality]
                ),
                "count": int(
                    locality_count.loc[locality]
                ),
            }

        # ----------------------------------------------------
        # Locality + BHK
        # ----------------------------------------------------

        grouped = work.groupby(
            ["Locality", "BHK_Size"]
        )["PPSF"]

        medians = grouped.median()
        counts = grouped.count()

        for key in medians.index:

            self.locality_bhk_stats[
                (key[0], int(key[1]))
            ] = {
                "median": float(
                    medians.loc[key]
                ),
                "count": int(
                    counts.loc[key]
                ),
            }

        # ----------------------------------------------------
        # Locality + Property Type
        # ----------------------------------------------------

        grouped = work.groupby(
            ["Locality", "Property_Type"]
        )["PPSF"]

        medians = grouped.median()
        counts = grouped.count()

        for key in medians.index:

            self.locality_type_stats[
                (
                    key[0],
                    str(key[1]),
                )
            ] = {
                "median": float(
                    medians.loc[key]
                ),
                "count": int(
                    counts.loc[key]
                ),
            }

        # ----------------------------------------------------
        # Region
        # ----------------------------------------------------

        grouped = work.groupby("Region")["PPSF"]

        medians = grouped.median()
        counts = grouped.count()

        for region in medians.index:

            self.region_stats[
                region
            ] = {
                "median": float(
                    medians.loc[region]
                ),
                "count": int(
                    counts.loc[region]
                ),
            }

        # ----------------------------------------------------
        # Region + BHK
        # ----------------------------------------------------

        grouped = work.groupby(
            ["Region", "BHK_Size"]
        )["PPSF"]

        medians = grouped.median()
        counts = grouped.count()

        for key in medians.index:

            self.region_bhk_stats[
                (
                    key[0],
                    int(key[1]),
                )
            ] = {
                "median": float(
                    medians.loc[key]
                ),
                "count": int(
                    counts.loc[key]
                ),
            }

        return self

    # --------------------------------------------------------

    def _locality_bhk(
        self,
        locality,
        bhk,
    ):

        item = self.locality_bhk_stats.get(
            (
                locality,
                int(bhk),
            )
        )

        if item and item["count"] >= 10:
            return item["median"]

        return np.nan

    # --------------------------------------------------------

    def _locality_type(
        self,
        locality,
        property_type,
    ):

        item = self.locality_type_stats.get(
            (
                locality,
                str(property_type),
            )
        )

        if item and item["count"] >= 10:
            return item["median"]

        return np.nan

    # --------------------------------------------------------

    def transform(self, df):

        out = df.copy()

        locality_ppsf = []
        locality_bhk_ppsf = []
        locality_type_ppsf = []
        region_ppsf = []
        region_bhk_ppsf = []
        fallback_level = []

        for _, row in out.iterrows():

            locality = row["Locality"]
            region = row["Region"]
            bhk = int(row["BHK_Size"])
            property_type = str(
                row["Property_Type"]
            )

            # ----------------------------------------------
            # Most specific market signal
            # ----------------------------------------------

            lb = self._locality_bhk(
                locality,
                bhk,
            )

            lt = self._locality_type(
                locality,
                property_type,
            )

            local = self.locality_stats.get(
                locality
            )

            local_value = (
                local["median"]
                if local and local["count"] >= 20
                else np.nan
            )

            region_bhk = (
                self.region_bhk_stats.get(
                    (
                        region,
                        bhk,
                    )
                )
            )

            region_bhk_value = (
                region_bhk["median"]
                if region_bhk
                and region_bhk["count"] >= 20
                else np.nan
            )

            region_item = (
                self.region_stats.get(
                    region
                )
            )

            region_value = (
                region_item["median"]
                if region_item
                else np.nan
            )

            # ----------------------------------------------
            # Hierarchical fallback
            # ----------------------------------------------

            if np.isfinite(lb):

                primary = lb
                level = "locality_bhk"

            elif np.isfinite(lt):

                primary = lt
                level = "locality_type"

            elif np.isfinite(local_value):

                primary = local_value
                level = "locality"

            elif np.isfinite(region_bhk_value):

                primary = region_bhk_value
                level = "region_bhk"

            elif np.isfinite(region_value):

                primary = region_value
                level = "region"

            else:

                primary = self.global_ppsf
                level = "global"

            locality_ppsf.append(
                float(
                    primary
                )
            )

            locality_bhk_ppsf.append(
                float(lb)
                if np.isfinite(lb)
                else float(primary)
            )

            locality_type_ppsf.append(
                float(lt)
                if np.isfinite(lt)
                else float(primary)
            )

            region_ppsf.append(
                float(region_value)
                if np.isfinite(region_value)
                else float(self.global_ppsf)
            )

            region_bhk_ppsf.append(
                float(region_bhk_value)
                if np.isfinite(region_bhk_value)
                else float(
                    region_value
                    if np.isfinite(region_value)
                    else self.global_ppsf
                )
            )

            fallback_level.append(
                level
            )

        out[
            "Locality_Market_PPSF"
        ] = locality_ppsf

        out[
            "Locality_BHK_PPSF"
        ] = locality_bhk_ppsf

        out[
            "Locality_Type_PPSF"
        ] = locality_type_ppsf

        out[
            "Region_Market_PPSF"
        ] = region_ppsf

        out[
            "Region_BHK_PPSF"
        ] = region_bhk_ppsf

        out[
            "Market_Fallback_Level"
        ] = fallback_level

        # Difference between property area and local market scale.
        out[
            "Area_Market_Interaction"
        ] = (
            out["Area_SqFt_Log"]
            * np.log1p(
                out["Locality_Market_PPSF"]
            )
        )

        return out