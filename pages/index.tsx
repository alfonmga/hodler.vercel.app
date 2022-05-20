import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  LogarithmicScale,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
} from "chart.js";
import "chartjs-adapter-date-fns";
import formatDate from "date-fns/format";
import fromUnixTime from "date-fns/fromUnixTime";
import { enUS } from "date-fns/locale";
import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { Chart } from "react-chartjs-2";
import { QueryExecResult } from "sql.js";
import { useDB, useDBQuery } from "../lib/useDb";

ChartJS.register(
  LogarithmicScale,
  LineController,
  CategoryScale,
  PointElement,
  LineElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Title
);

const DEFAULT_HOLDINGS_AMOUNT_VALUE = 1;

const Home: NextPage<{ dbBinStr: string }> = ({ dbBinStr }) => {
  const dbBin = useMemo(
    () => (dbBinStr ? (JSON.parse(dbBinStr).data as Uint8Array) : null),
    [dbBinStr]
  );
  const db = useDB(dbBin);
  const [query, _] = useState("SELECT date, price FROM prices;");
  const bitcoinPricesData = useDBQuery(db, query);
  const [holdingsAmountV, setHoldingsAmountV] = useState<number>(
    DEFAULT_HOLDINGS_AMOUNT_VALUE
  );

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=1480, minimal-ui, initial-scale=1.0, maximum-scale=1.0,user-scalable=0"
        />
      </Head>
      <div>
        <Head>
          <title>Bitcoin holdings value visualizer</title>
          <meta
            name="description"
            content="Visualize your Bitcoin holdings value over time."
          />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <h1 style={{ color: "white" }}>
            Visualize your Bitcoin holdings value over time
          </h1>
          <HoldingsInputField
            currentHoldingsAmountV={holdingsAmountV}
            onChange={(v) => setHoldingsAmountV(v)}
          />
        </div>
        <HoldingsChart
          key={holdingsAmountV}
          bitcoinPricesData={bitcoinPricesData}
          holdingsAmountV={holdingsAmountV}
        />
      </div>
    </>
  );
};
const HoldingsInputField = ({
  currentHoldingsAmountV,
  onChange,
}: {
  currentHoldingsAmountV: number;
  onChange: (value: number) => void;
}) => {
  const [holdingsInputV, setHoldingsInputV] = useState<string>(
    String(currentHoldingsAmountV)
  );
  const [generatedV, setGeneratedV] = useState(currentHoldingsAmountV);
  const onGenerate = () => {
    let n = Number(holdingsInputV);
    if (Number.isNaN(n) === false) {
      setGeneratedV(generatedV);
      onChange(Number(n.toFixed(8)));
    }
  };

  return (
    <>
      <input
        style={{ marginTop: "-22px" }}
        type="text"
        value={holdingsInputV}
        onChange={(evt) => setHoldingsInputV(evt.currentTarget.value)}
        placeholder="0.00000000 BTC"
      />
      <button
        onClick={onGenerate}
        disabled={
          holdingsInputV.length === 0 || holdingsInputV === String(generatedV)
        }
      >
        Generate chart
      </button>
    </>
  );
};
const HoldingsChart = ({
  bitcoinPricesData,
  holdingsAmountV,
}: {
  bitcoinPricesData: QueryExecResult[] | null;
  holdingsAmountV: number;
}) => {
  const chartData = useMemo(() => {
    let labels: any[] = [];
    let data: any[] = [];
    if (bitcoinPricesData !== null) {
      bitcoinPricesData[0].values.map((v) => {
        const d = fromUnixTime(v[0] as number);
        const p = v[1] as number;
        labels.push(d);
        data.push({ x: d, y: holdingsAmountV * p, price: p });
      });
    }

    return {
      labels,
      datasets: [
        {
          label: "Holdings value",
          data,
          borderColor: "#f2a900",
          backgroundColor: "#f2a900",
          pointRadius: 0,
        },
      ],
    };
  }, [bitcoinPricesData, holdingsAmountV]);

  return (
    <div
      style={{
        display: "flex",
        alignContent: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "95%" }}>
        <Chart
          data={chartData}
          options={{
            interaction: {
              mode: "nearest",
              axis: "x",
              intersect: false,
            },
            responsive: true,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                backgroundColor: "#222531",
                callbacks: {
                  title: function (j) {
                    return formatDate(j[0].parsed.x, "MM/dd/yyyy");
                  },
                  label: function (context) {
                    return [
                      `${context.dataset.label}: ${new Intl.NumberFormat(
                        "en-US",
                        {
                          style: "currency",
                          currency: "USD",
                        }
                      ).format(context.parsed.y)}`,
                      `Bitcoin price: ${new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format((context.raw as any).price as number)}`,
                    ];
                  },
                },
              },
            },
            scales: {
              x: {
                grid: {
                  color: "#222531",
                },
                display: true,
                type: "time",
                time: {
                  unit: "year",
                },
                adapters: {
                  date: {
                    locale: enUS,
                  },
                },
              },
              y: {
                grid: {
                  color: "#222531",
                },
                display: true,
                type: "logarithmic",
                ticks: {
                  color: "#858ca2",
                },
              },
            },
          }}
          type="line"
        />
      </div>
    </div>
  );
};

export const getStaticProps: GetStaticProps = async (_) => {
  const fs = require("fs");
  const path = require("path");
  const dbBinPath = path.resolve(process.cwd(), "data.sqlite3");
  let dbBin = fs.readFileSync(dbBinPath) as Buffer;
  return {
    props: {
      dbBinStr: JSON.stringify(dbBin),
    },
  };
};

export default Home;
