// Auto-generated mission trace dataset for /sources/ Evidence Observatory
import type { MissionTraceNode } from "./types";

export interface StaticMissionTraceNode extends Omit<MissionTraceNode, "sources"> {
  sourceIds: string[];
}

export const MISSION_TRACE_DATA: StaticMissionTraceNode[] = [
  {
    "id": "apollo-11",
    "name": {
      "en": "Apollo 11 · Tranquility Base",
      "bn": "অ্যাপোলো ১১ · ট্রাঙ্কুইলিটি বেস"
    },
    "mission": "Apollo 11",
    "body": "moon",
    "kind": "crewed-landing",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "1969-07-20",
      "verification": "verified",
      "sourceId": "img:as11-40-5948"
    },
    "site": {
      "en": "Sea of Tranquility",
      "bn": "প্রশান্তি সাগর (মেয়ার ট্রাঙ্কুইলিটাটিস)"
    },
    "coordinates": {
      "lon": 23.47,
      "lat": 0.67,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Landed",
          "bn": "অবতরণ"
        },
        "value": {
          "en": "20 July 1969",
          "bn": "২০ জুলাই ১৯৬৯"
        },
        "sourceId": "img:as11-40-5948",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Site",
          "bn": "স্থান"
        },
        "value": {
          "en": "Sea of Tranquility",
          "bn": "প্রশান্তি সাগর"
        },
        "sourceId": "img:as11-40-5948",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Instruments",
          "bn": "যন্ত্র"
        },
        "value": {
          "en": "Passive Seismic Experiment Package · Laser Ranging Retro-Reflector",
          "bn": "প্যাসিভ সিসমিক এক্সপেরিমেন্ট প্যাকেজ · লেজার রেঞ্জিং রেট্রো-রিফ্লেক্টর"
        },
        "sourceId": "img:as11-37-5551",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Revisited from orbit",
          "bn": "কক্ষপথ থেকে পুনর্দর্শন"
        },
        "value": {
          "en": "Lunar Reconnaissance Orbiter, 2009",
          "bn": "লুনার রিকনিস্যান্স অরবিটার, ২০০৯"
        },
        "sourceId": "img:PIA12909",
        "verification": "verified"
      }
    ],
    "sourceIds": [
      "img:as11-40-5948",
      "img:as11-37-5551",
      "img:PIA12909",
      "nssdca:1969-059C"
    ],
    "imageId": "as11-40-5948",
    "storyTitle": {
      "en": "The mirror that never stopped answering",
      "bn": "যে আয়না কখনো উত্তর দেওয়া থামায়নি"
    },
    "storyDek": {
      "en": "Apollo 11 left two experiments on the Sea of Tranquility. One needed power. One only needed light.",
      "bn": "অ্যাপোলো ১১ প্রশান্তি সাগরে দুটি পরীক্ষা রেখে এসেছিল। একটির দরকার ছিল বিদ্যুৎ, অন্যটির শুধু আলো।"
    },
    "gameUsage": "Game Chapter 4 Objective & Exhibit 01 (Tranquility Base, Laser Retroreflector, Solar Wind)"
  },
  {
    "id": "surveyor-1",
    "name": {
      "en": "Surveyor 1",
      "bn": "সার্ভেয়ার ১"
    },
    "mission": "Surveyor 1",
    "body": "moon",
    "kind": "lander",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "1966-06-02",
      "verification": "verified",
      "sourceId": "img:PIA12910"
    },
    "site": {
      "en": "Oceanus Procellarum",
      "bn": "ঝড়ের মহাসাগর (ওশেনাস প্রোসেলারাম)"
    },
    "coordinates": {
      "lon": -43.34,
      "lat": -2.47,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Landed",
          "bn": "অবতরণ"
        },
        "value": {
          "en": "2 June 1966",
          "bn": "২ জুন ১৯৬৬"
        },
        "sourceId": "img:PIA12910",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Site",
          "bn": "স্থান"
        },
        "value": {
          "en": "Oceanus Procellarum",
          "bn": "ওশেনাস প্রোসেলারাম"
        },
        "sourceId": "img:PIA12910",
        "verification": "verified"
      }
    ],
    "sourceIds": [
      "img:PIA12910",
      "nssdca:1966-045A"
    ],
    "imageId": "PIA12910",
    "storyTitle": {
      "en": "The first to land softly",
      "bn": "প্রথম কোমল অবতরণ"
    },
    "storyDek": {
      "en": "Before anyone walked on the Moon, a robot had to prove the ground would hold.",
      "bn": "কেউ চাঁদে হাঁটার আগে, এক রোবটকে প্রমাণ করতে হয়েছিল যে মাটি ভার সইবে।"
    },
    "gameUsage": "Exhibit 03 & Lunar Exploration Legacy (First U.S. soft lunar landing)"
  },
  {
    "id": "surveyor-3",
    "name": {
      "en": "Surveyor 3",
      "bn": "সার্ভেয়ার ৩"
    },
    "mission": "Surveyor 3",
    "body": "moon",
    "kind": "lander",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "1967-04-19",
      "verification": "verified",
      "sourceId": "img:as12-48-7121"
    },
    "site": {
      "en": "Oceanus Procellarum",
      "bn": "ঝড়ের মহাসাগর (ওশেনাস প্রোসেলারাম)"
    },
    "coordinates": {
      "lon": -23.42,
      "lat": -3.02,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Landed",
          "bn": "অবতরণ"
        },
        "value": {
          "en": "19 April 1967 (per NASA caption)",
          "bn": "১৯ এপ্রিল ১৯৬৭ (নাসার ক্যাপশন অনুযায়ী)"
        },
        "sourceId": "img:as12-48-7121",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Apollo 12 landing distance",
          "bn": "অ্যাপোলো ১২-এর অবতরণ দূরত্ব"
        },
        "value": {
          "en": "About 600 feet",
          "bn": "প্রায় ৬০০ ফুট"
        },
        "sourceId": "img:AS12-48-7133",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Returned to Earth",
          "bn": "পৃথিবীতে ফেরত"
        },
        "value": {
          "en": "Television camera and several other pieces",
          "bn": "টেলিভিশন ক্যামেরা ও আরও কিছু অংশ"
        },
        "sourceId": "img:AS12-48-7133",
        "verification": "verified"
      }
    ],
    "sourceIds": [
      "img:as12-48-7121",
      "img:AS12-48-7133",
      "nssdca:1967-035A"
    ],
    "imageId": "as12-48-7121",
    "storyTitle": {
      "en": "When one machine visited another",
      "bn": "যখন এক যন্ত্র আরেক যন্ত্রকে দেখতে গেল"
    },
    "storyDek": {
      "en": "Surveyor 3 waited in its crater for two and a half years. Then Apollo 12 landed about 600 feet away.",
      "bn": "সার্ভেয়ার ৩ আড়াই বছর তার খাদে অপেক্ষা করেছিল। তারপর প্রায় ৬০০ ফুট দূরে নামল অ্যাপোলো ১২।"
    },
    "gameUsage": "Game Chapter 2 Puzzle & Exhibit 02 (Apollo 12 precision landing 600 ft away)"
  },
  {
    "id": "apollo-12",
    "name": {
      "en": "Apollo 12",
      "bn": "অ্যাপোলো ১২"
    },
    "mission": "Apollo 12",
    "body": "moon",
    "kind": "crewed-landing",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "1969-11-19",
      "verification": "required",
      "sourceId": null
    },
    "site": {
      "en": "Ocean of Storms",
      "bn": "ঝড়ের মহাসাগর (ওশেনাস প্রোসেলারাম)"
    },
    "coordinates": {
      "lon": -23.42,
      "lat": -3.01,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Landed Date",
          "bn": "অবতরণের তারিখ"
        },
        "value": {
          "en": "19 November 1969",
          "bn": "১৯ নভেম্বর ১৯৬৯"
        },
        "sourceId": "img:AS12-48-7133",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Surveyor 3 Precision Rendezvous",
          "bn": "সার্ভেয়ার ৩ সুনির্দিষ্ট সাক্ষাৎ"
        },
        "value": {
          "en": "Landed within walking distance (~180m / 600ft) of Surveyor 3",
          "bn": "সার্ভেয়ার ৩-এর হাঁটার দূরত্বের মধ্যে (~১৮০ মিটার) অবতরণ"
        },
        "sourceId": "img:AS12-48-7133",
        "verification": "verified"
      }
    ],
    "sourceIds": [
      "img:AS12-48-7133",
      "nssdca:1969-099C"
    ],
    "imageId": "AS12-48-7133",
    "gameUsage": "Game Chapter 2 & Exhibit 02 (Precision walk to Surveyor 3)"
  },
  {
    "id": "apollo-14",
    "name": {
      "en": "Apollo 14",
      "bn": "অ্যাপোলো ১৪"
    },
    "mission": "Apollo 14",
    "body": "moon",
    "kind": "crewed-landing",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "1971-02-05",
      "verification": "verified",
      "sourceId": "img:as14-67-09361"
    },
    "site": {
      "en": "Fra Mauro highlands",
      "bn": "ফ্রা মাউরো উচ্চভূমি"
    },
    "coordinates": {
      "lon": -17.47,
      "lat": -3.65,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "ALSEP deployed",
          "bn": "এএলএসইপি স্থাপন"
        },
        "value": {
          "en": "5 February 1971",
          "bn": "৫ ফেব্রুয়ারি ১৯৭১"
        },
        "sourceId": "img:as14-67-09361",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Crew on surface",
          "bn": "পৃষ্ঠে নভোচারী"
        },
        "value": {
          "en": "Alan B. Shepard Jr., Edgar D. Mitchell",
          "bn": "অ্যালান বি. শেপার্ড জুনিয়র, এডগার ডি. মিচেল"
        },
        "sourceId": "img:as14-67-09361",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Laser retroreflector",
          "bn": "লেজার রেট্রোরিফ্লেক্টর"
        },
        "value": {
          "en": "Deployed at this site",
          "bn": "এই স্থানে স্থাপিত"
        },
        "sourceId": "nssdca:1971-008C",
        "verification": "required"
      }
    ],
    "sourceIds": [
      "img:as14-67-09361",
      "nssdca:1971-008C"
    ],
    "imageId": "as14-67-09361",
    "storyTitle": {
      "en": "A station at Fra Mauro",
      "bn": "ফ্রা মাউরোর একটি কেন্দ্র"
    },
    "storyDek": {
      "en": "Alan Shepard and Edgar Mitchell set up a science station and left it listening.",
      "bn": "অ্যালান শেপার্ড ও এডগার মিচেল একটি বিজ্ঞান-কেন্দ্র বসিয়ে তাকে শোনার কাজে রেখে আসেন।"
    },
    "gameUsage": "Exhibit 04 (Fra Mauro highlands, modular equipment transporter)"
  },
  {
    "id": "apollo-15",
    "name": {
      "en": "Apollo 15",
      "bn": "অ্যাপোলো ১৫"
    },
    "mission": "Apollo 15",
    "body": "moon",
    "kind": "crewed-landing",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "1971-07-30",
      "verification": "required",
      "sourceId": null
    },
    "site": {
      "en": "Hadley–Apennine",
      "bn": "হ্যাডলি–অ্যাপেনাইন"
    },
    "coordinates": {
      "lon": 3.63,
      "lat": 26.13,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Landed",
          "bn": "অবতরণ"
        },
        "value": {
          "en": "30 July 1971",
          "bn": "৩০ জুলাই ১৯৭১"
        },
        "sourceId": "nssdca:1971-063C",
        "verification": "required"
      },
      {
        "label": {
          "en": "Laser retroreflector",
          "bn": "লেজার রেট্রোরিফ্লেক্টর"
        },
        "value": {
          "en": "Deployed at this site",
          "bn": "এই স্থানে স্থাপিত"
        },
        "sourceId": "img:PIA13037",
        "verification": "verified"
      }
    ],
    "sourceIds": [
      "img:PIA13037",
      "nssdca:1971-063C"
    ],
    "imageId": "PIA13037",
    "storyTitle": {
      "en": "A fundamental point on the Moon",
      "bn": "চাঁদের এক মৌলিক বিন্দু"
    },
    "storyDek": {
      "en": "At Hadley–Apennine, Apollo 15 left a larger laser reflector array.",
      "bn": "হ্যাডলি–অ্যাপেনাইনে অ্যাপোলো ১৫ একটি বড় লেজার প্রতিফলক রেখে আসে।"
    },
    "gameUsage": "Exhibit 05 (Hadley Rille, Lunar Roving Vehicle, laser retroreflector)"
  },
  {
    "id": "apollo-16",
    "name": {
      "en": "Apollo 16",
      "bn": "অ্যাপোলো ১৬"
    },
    "mission": "Apollo 16",
    "body": "moon",
    "kind": "crewed-landing",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "1972-04-21",
      "verification": "verified",
      "sourceId": "img:as16-113-18347"
    },
    "site": {
      "en": "Descartes highlands",
      "bn": "দেকার্ত উচ্চভূমি"
    },
    "coordinates": {
      "lon": 15.5,
      "lat": -8.97,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "ALSEP deployed",
          "bn": "এএলএসইপি স্থাপন"
        },
        "value": {
          "en": "21 April 1972",
          "bn": "২১ এপ্রিল ১৯৭২"
        },
        "sourceId": "img:as16-113-18347",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Crew on surface",
          "bn": "পৃষ্ঠে নভোচারী"
        },
        "value": {
          "en": "John W. Young, Charles M. Duke Jr.",
          "bn": "জন ডব্লিউ. ইয়াং, চার্লস এম. ডিউক জুনিয়র"
        },
        "sourceId": "img:as16-113-18347",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Lunar Module",
          "bn": "লুনার মডিউল"
        },
        "value": {
          "en": "Orion",
          "bn": "ওরিয়ন"
        },
        "sourceId": "img:as16-113-18347",
        "verification": "verified"
      }
    ],
    "sourceIds": [
      "img:as16-113-18347",
      "nssdca:1972-031C"
    ],
    "imageId": "as16-113-18347",
    "storyTitle": {
      "en": "Listening in the highlands",
      "bn": "উচ্চভূমিতে কান পেতে"
    },
    "storyDek": {
      "en": "John Young and Charles Duke set a seismometer into the Descartes highlands.",
      "bn": "জন ইয়াং ও চার্লস ডিউক দেকার্ত উচ্চভূমিতে একটি সিসমোমিটার বসান।"
    },
    "gameUsage": "Exhibit 06 (Descartes Highlands, far-ultraviolet camera)"
  },
  {
    "id": "apollo-17",
    "name": {
      "en": "Apollo 17",
      "bn": "অ্যাপোলো ১৭"
    },
    "mission": "Apollo 17",
    "body": "moon",
    "kind": "crewed-landing",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "1972-12-11",
      "verification": "verified",
      "sourceId": "img:as17-147-22548"
    },
    "site": {
      "en": "Taurus–Littrow valley",
      "bn": "টরাস–লিট্রো উপত্যকা"
    },
    "coordinates": {
      "lon": 30.77,
      "lat": 20.19,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "ALSEP deployed",
          "bn": "এএলএসইপি স্থাপন"
        },
        "value": {
          "en": "11 December 1972",
          "bn": "১১ ডিসেম্বর ১৯৭২"
        },
        "sourceId": "img:as17-147-22548",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Crew on surface",
          "bn": "পৃষ্ঠে নভোচারী"
        },
        "value": {
          "en": "Eugene A. Cernan, Harrison H. Schmitt",
          "bn": "ইউজিন এ. সারনান, হ্যারিসন এইচ. শ্মিট"
        },
        "sourceId": "img:as17-147-22548",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Site",
          "bn": "স্থান"
        },
        "value": {
          "en": "Taurus–Littrow",
          "bn": "টরাস–লিট্রো"
        },
        "sourceId": "img:as17-147-22548",
        "verification": "verified"
      }
    ],
    "sourceIds": [
      "img:as17-147-22548",
      "nssdca:1972-096C"
    ],
    "imageId": "as17-147-22548",
    "storyTitle": {
      "en": "The last station",
      "bn": "শেষ কেন্দ্র"
    },
    "storyDek": {
      "en": "In the Taurus–Littrow valley, the final Apollo crew set up the final Apollo science station.",
      "bn": "টরাস–লিট্রো উপত্যকায় অ্যাপোলোর শেষ নভোচারী দল বসায় অ্যাপোলোর শেষ বিজ্ঞান-কেন্দ্র।"
    },
    "gameUsage": "Exhibit 07 (Taurus-Littrow valley, geologist astronaut mission)"
  },
  {
    "id": "viking-1",
    "name": {
      "en": "Viking 1 Lander",
      "bn": "ভাইকিং ১ ল্যান্ডার"
    },
    "mission": "Viking 1",
    "body": "mars",
    "kind": "lander",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "1976-07-20",
      "verification": "verified",
      "sourceId": "img:PIA00381"
    },
    "site": {
      "en": "Chryse Planitia",
      "bn": "ক্রাইসি প্ল্যানিশিয়া"
    },
    "coordinates": {
      "lon": -47.95,
      "lat": 22.27,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Landed",
          "bn": "অবতরণ"
        },
        "value": {
          "en": "20 July 1976",
          "bn": "২০ জুলাই ১৯৭৬"
        },
        "sourceId": "img:PIA00381",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Site",
          "bn": "স্থান"
        },
        "value": {
          "en": "Chryse Planitia",
          "bn": "ক্রাইসি প্ল্যানিশিয়া"
        },
        "sourceId": "img:PIA03165",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Last contact",
          "bn": "শেষ যোগাযোগ"
        },
        "value": {
          "en": "November 1982",
          "bn": "নভেম্বর ১৯৮২"
        },
        "sourceId": "nssdca:1975-075C",
        "verification": "required"
      }
    ],
    "sourceIds": [
      "img:PIA00381",
      "img:PIA03165",
      "nssdca:1975-075C"
    ],
    "imageId": "PIA03165",
    "storyTitle": {
      "en": "The first photograph from the surface of Mars",
      "bn": "মঙ্গলের পৃষ্ঠ থেকে প্রথম ছবি"
    },
    "storyDek": {
      "en": "Minutes after touchdown, Viking 1 looked down at its own footpad.",
      "bn": "অবতরণের কয়েক মিনিট পর, ভাইকিং ১ নিজের পায়ের দিকে তাকাল।"
    },
    "gameUsage": "Game Chapter 3 & Exhibit 08 (Chryse Planitia, first continuous Mars surface operations)"
  },
  {
    "id": "viking-2",
    "name": {
      "en": "Viking 2 Lander",
      "bn": "ভাইকিং ২ ল্যান্ডার"
    },
    "mission": "Viking 2",
    "body": "mars",
    "kind": "lander",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "1976-09-03",
      "verification": "verified",
      "sourceId": "img:PIA04023"
    },
    "site": {
      "en": "Utopia Planitia",
      "bn": "ইউটোপিয়া প্ল্যানিশিয়া"
    },
    "coordinates": {
      "lon": 134,
      "lat": 48,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Landed",
          "bn": "অবতরণ"
        },
        "value": {
          "en": "3 September 1976",
          "bn": "৩ সেপ্টেম্বর ১৯৭৬"
        },
        "sourceId": "img:PIA04023",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Site",
          "bn": "স্থান"
        },
        "value": {
          "en": "Utopia Planitia",
          "bn": "ইউটোপিয়া প্ল্যানিশিয়া"
        },
        "sourceId": "img:PIA04023",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Location certainty",
          "bn": "অবস্থানের নিশ্চয়তা"
        },
        "value": {
          "en": "Less established than Viking 1",
          "bn": "ভাইকিং ১-এর চেয়ে কম নিশ্চিত"
        },
        "sourceId": "img:PIA04023",
        "verification": "verified"
      }
    ],
    "sourceIds": [
      "img:PIA04023",
      "nssdca:1975-083C"
    ],
    "imageId": "PIA04023",
    "storyTitle": {
      "en": "A lander whose exact spot is still uncertain",
      "bn": "যে ল্যান্ডারের সঠিক অবস্থান এখনও অনিশ্চিত"
    },
    "storyDek": {
      "en": "The second landing on Mars took place in Utopia Planitia.",
      "bn": "মঙ্গলে দ্বিতীয় অবতরণ হয়েছিল ইউটোপিয়া প্ল্যানিশিয়ায়।"
    },
    "gameUsage": "Game Chapter 3 & Exhibit 09 (Utopia Planitia biological search)"
  },
  {
    "id": "pathfinder",
    "name": {
      "en": "Mars Pathfinder & Sojourner",
      "bn": "মার্স পাথফাইন্ডার ও সোজার্নার"
    },
    "mission": "Mars Pathfinder",
    "body": "mars",
    "kind": "rover",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "1997-07-04",
      "verification": "required",
      "sourceId": null
    },
    "site": {
      "en": "Ares Vallis",
      "bn": "এরেস ভ্যালিস"
    },
    "coordinates": {
      "lon": -33.22,
      "lat": 19.13,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Landed",
          "bn": "অবতরণ"
        },
        "value": {
          "en": "4 July 1997",
          "bn": "৪ জুলাই ১৯৯৭"
        },
        "sourceId": "nssdca:1996-068A",
        "verification": "required"
      },
      {
        "label": {
          "en": "Last contact",
          "bn": "শেষ যোগাযোগ"
        },
        "value": {
          "en": "27 September 1997",
          "bn": "২৭ সেপ্টেম্বর ১৯৯৭"
        },
        "sourceId": "nssdca:1996-068A",
        "verification": "required"
      },
      {
        "label": {
          "en": "Rover lineage",
          "bn": "রোভার-বংশধারা"
        },
        "value": {
          "en": "Sojourner → Spirit & Opportunity → Curiosity",
          "bn": "সোজার্নার → স্পিরিট ও অপরচুনিটি → কিউরিওসিটি"
        },
        "sourceId": "cap:PIA11436",
        "verification": "verified"
      }
    ],
    "sourceIds": [
      "img:PIA04318",
      "nssdca:1996-068A"
    ],
    "imageId": "PIA04318",
    "storyTitle": {
      "en": "Small wheels, first tracks",
      "bn": "ছোট চাকা, প্রথম চাকার দাগ"
    },
    "storyDek": {
      "en": "Sojourner was the first of NASA's Mars rovers.",
      "bn": "সোজার্নার ছিল নাসার মঙ্গল-রোভারদের প্রথমটি।"
    },
    "gameUsage": "Game Chapter 1 side-discovery & Exhibit 10 (Sojourner first mobile wheeled rover)"
  },
  {
    "id": "spirit",
    "name": {
      "en": "Spirit (MER-A)",
      "bn": "স্পিরিট (এমইআর-এ)"
    },
    "mission": "Mars Exploration Rover",
    "body": "mars",
    "kind": "rover",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "2004-01-04",
      "verification": "verified",
      "sourceId": "sci:mer-spirit"
    },
    "site": {
      "en": "Gusev crater",
      "bn": "গুসেভ খাদ"
    },
    "coordinates": {
      "lon": 175.47,
      "lat": -14.57,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Landed Date",
          "bn": "অবতরণের তারিখ"
        },
        "value": {
          "en": "4 January 2004",
          "bn": "৪ জানুয়ারি ২০০৪"
        },
        "sourceId": "sci:mer-spirit",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Last Communication",
          "bn": "শেষ যোগাযোগ"
        },
        "value": {
          "en": "22 March 2010 (concluded May 2011)",
          "bn": "২২ মার্চ ২০১০ (সমাপ্ত মে ২০১১)"
        },
        "sourceId": "sci:mer-spirit",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Summit Panorama (3-D)",
          "bn": "শীর্ষ প্যানোরামা (৩-ডি)"
        },
        "value": {
          "en": "Sweeping View of Columbia Hills & Gusev Crater",
          "bn": "কলম্বিয়া হিলস ও গুসেভ খাদের ৩-ডি দৃশ্য"
        },
        "sourceId": "img:PIA03250",
        "verification": "verified"
      },
      {
        "label": {
          "en": "NSSDCA Catalog Entry",
          "bn": "এনএসএসডিসিএ ক্যাটালগ এন্ট্রি"
        },
        "value": {
          "en": "COSPAR ID 2003-027A (NASA catalog confirmed)",
          "bn": "কসপার আইডি ২০০৩-০২৭এ (নাসা ক্যাটালগে নিশ্চিত)"
        },
        "sourceId": "nssdca:2003-027A",
        "verification": "verified"
      }
    ],
    "sourceIds": [
      "sci:mer-spirit",
      "img:PIA03250",
      "nssdca:2003-027A"
    ],
    "imageId": "PIA03250",
    "storyTitle": {
      "en": "The rover that kept looking at the hills",
      "bn": "যে রোভার পাহাড়ের দিকে তাকিয়ে থাকত"
    },
    "storyDek": {
      "en": "Spirit explored Gusev crater and climbed into the Columbia Hills.",
      "bn": "স্পিরিট গুসেভ খাদ ঘুরে কলাম্বিয়া হিলসে উঠেছিল।"
    },
    "gameUsage": "Game Chapter 4 & Rover Legacy (Husband Hill summit panorama PIA03250, storm lab, past-water clues)"
  },
  {
    "id": "opportunity",
    "name": {
      "en": "Opportunity (MER-B)",
      "bn": "অপরচুনিটি (এমইআর-বি)"
    },
    "mission": "Mars Exploration Rover",
    "body": "mars",
    "kind": "rover",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "2004-01-25",
      "verification": "required",
      "sourceId": null
    },
    "site": {
      "en": "Meridiani Planum → Endeavour crater",
      "bn": "মেরিডিয়ানি প্লেনাম → এনডেভার খাদ"
    },
    "coordinates": {
      "lon": -5.53,
      "lat": -1.95,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Last contact",
          "bn": "শেষ যোগাযোগ"
        },
        "value": {
          "en": "10 June 2018",
          "bn": "১০ জুন ২০১৮"
        },
        "sourceId": "img:PIA23178",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Distance driven",
          "bn": "অতিক্রান্ত দূরত্ব"
        },
        "value": {
          "en": "45.16 km (28.06 miles)",
          "bn": "৪৫.১৬ কিমি (২৮.০৬ মাইল)"
        },
        "sourceId": "img:PIA23178",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Final panorama",
          "bn": "শেষ প্যানোরামা"
        },
        "value": {
          "en": "354 images, sols 5,084–5,111",
          "bn": "৩৫৪টি ছবি, সল ৫,০৮৪–৫,১১১"
        },
        "sourceId": "img:PIA22909",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Often-quoted “last words”",
          "bn": "বহুল উদ্ধৃত “শেষ কথা”"
        },
        "value": {
          "en": "A popular paraphrase, not a transmitted message",
          "bn": "একটি জনপ্রিয় ভাবানুবাদ, পাঠানো কোনো বার্তা নয়"
        },
        "sourceId": null,
        "verification": "required"
      }
    ],
    "sourceIds": [
      "img:PIA22909",
      "img:PIA23178",
      "nssdca:2003-032A"
    ],
    "imageId": "PIA22909",
    "storyTitle": {
      "en": "The last panorama",
      "bn": "শেষ প্যানোরামা"
    },
    "storyDek": {
      "en": "Opportunity's final 360° view was still being assembled when a planet-wide dust storm closed in.",
      "bn": "গ্রহজুড়ে ধুলোঝড় ঘনিয়ে আসার সময়ও অপরচুনিটির শেষ ৩৬০° দৃশ্য তৈরি হচ্ছিল।"
    },
    "gameUsage": "Game Chapter 1 (Endeavour crater 45.16 km traverse & Legacy Pan PIA22909)"
  },
  {
    "id": "phoenix",
    "name": {
      "en": "Phoenix",
      "bn": "ফিনিক্স"
    },
    "mission": "Phoenix",
    "body": "mars",
    "kind": "lander",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "2008-05-25",
      "verification": "required",
      "sourceId": null
    },
    "site": {
      "en": "Vastitas Borealis, northern plains",
      "bn": "ভাস্টিটাস বোরিয়ালিস, উত্তরের সমভূমি"
    },
    "coordinates": {
      "lon": -125.75,
      "lat": 68.22,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Landed",
          "bn": "অবতরণ"
        },
        "value": {
          "en": "25 May 2008",
          "bn": "২৫ মে ২০০৮"
        },
        "sourceId": "nssdca:2007-034A",
        "verification": "required"
      },
      {
        "label": {
          "en": "Imaged from orbit",
          "bn": "কক্ষপথ থেকে ছবি"
        },
        "value": {
          "en": "HiRISE, Mars Reconnaissance Orbiter",
          "bn": "হাইরাইজ, মার্স রিকনিস্যান্স অরবিটার"
        },
        "sourceId": "img:PIA10701",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Last contact",
          "bn": "শেষ যোগাযোগ"
        },
        "value": {
          "en": "November 2008",
          "bn": "নভেম্বর ২০০৮"
        },
        "sourceId": "nssdca:2007-034A",
        "verification": "required"
      }
    ],
    "sourceIds": [
      "img:PIA10701",
      "nssdca:2007-034A"
    ],
    "imageId": "PIA10701",
    "storyTitle": {
      "en": "Seen from above",
      "bn": "ওপর থেকে দেখা"
    },
    "storyDek": {
      "en": "Phoenix landed far north, on the plains where Martian winter arrives hard.",
      "bn": "ফিনিক্স নেমেছিল অনেক উত্তরে, যেখানে মঙ্গলের শীত নামে কঠোরভাবে।"
    },
    "gameUsage": "Exhibit 12 (Vastitas Borealis arctic water-ice confirmation)"
  },
  {
    "id": "insight",
    "name": {
      "en": "InSight",
      "bn": "ইনসাইট"
    },
    "mission": "InSight",
    "body": "mars",
    "kind": "lander",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "2018-11-26",
      "verification": "required",
      "sourceId": null
    },
    "site": {
      "en": "Elysium Planitia",
      "bn": "এলিসিয়াম প্ল্যানিশিয়া"
    },
    "coordinates": {
      "lon": 135.62,
      "lat": 4.5,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Final selfie",
          "bn": "শেষ সেলফি"
        },
        "value": {
          "en": "24 April 2022, sol 1,211",
          "bn": "২৪ এপ্রিল ২০২২, সল ১,২১১"
        },
        "sourceId": "img:PIA25287",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Mission ended",
          "bn": "মিশন সমাপ্ত"
        },
        "value": {
          "en": "2022",
          "bn": "২০২২"
        },
        "sourceId": "img:PIA26635",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Results published after silence",
          "bn": "নীরবতার পরে প্রকাশিত ফল"
        },
        "value": {
          "en": "Science, 28 August 2025",
          "bn": "সায়েন্স, ২৮ আগস্ট ২০২৫"
        },
        "sourceId": "img:PIA26635",
        "verification": "verified"
      }
    ],
    "sourceIds": [
      "img:PIA25287",
      "img:PIA23177",
      "img:PIA24263",
      "img:PIA26635",
      "nssdca:2018-042A"
    ],
    "imageId": "PIA25287",
    "storyTitle": {
      "en": "Listening to the inside of a planet",
      "bn": "এক গ্রহের ভেতরের শব্দ শোনা"
    },
    "storyDek": {
      "en": "InSight's seismometer kept listening until dust covered the panels that powered it.",
      "bn": "যে প্যানেলগুলো ইনসাইটকে শক্তি দিত সেগুলো ধুলোয় ঢাকা পড়া পর্যন্ত এর সিসমোমিটার শুনে গেছে।"
    },
    "gameUsage": "Game Chapter 5 & Exhibit 13 (Elysium Planitia marsquakes, SEIS seismometer, HP3 heat probe)"
  },
  {
    "id": "curiosity",
    "name": {
      "en": "Curiosity",
      "bn": "কিউরিওসিটি"
    },
    "mission": "Mars Science Laboratory",
    "body": "mars",
    "kind": "rover",
    "status": "active",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "2012-08-06",
      "verification": "required",
      "sourceId": "cap:PIA17064"
    },
    "site": {
      "en": "Gale crater · Bradbury Landing",
      "bn": "গেল খাদ · ব্র্যাডবেরি ল্যান্ডিং"
    },
    "coordinates": {
      "lon": 137.44,
      "lat": -4.59,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Landed",
          "bn": "অবতরণ"
        },
        "value": {
          "en": "August 2012 · Bradbury Landing, Gale crater",
          "bn": "আগস্ট ২০১২ · ব্র্যাডবেরি ল্যান্ডিং, গেল খাদ"
        },
        "sourceId": "cap:PIA17064",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Seventh drill sample",
          "bn": "সপ্তম ড্রিল-নমুনা"
        },
        "value": {
          "en": "“Buckskin”, 2015",
          "bn": "“বাকস্কিন”, ২০১৫"
        },
        "sourceId": "img:PIA19807",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Status",
          "bn": "অবস্থা"
        },
        "value": {
          "en": "Listed as active — Source verification required",
          "bn": "সক্রিয় হিসেবে তালিকাভুক্ত — উৎস যাচাই প্রয়োজন"
        },
        "sourceId": "nssdca:2011-070A",
        "verification": "required"
      }
    ],
    "sourceIds": [
      "img:PIA19807",
      "cap:PIA17064",
      "nssdca:2011-070A"
    ],
    "imageId": "PIA19807",
    "storyTitle": {
      "en": "Still climbing",
      "bn": "এখনও আরোহণ"
    },
    "storyDek": {
      "en": "Not every machine in this museum is silent.",
      "bn": "এই জাদুঘরের সব যন্ত্র নীরব নয়।"
    },
    "gameUsage": "Exhibit 14 & Rover Legacy (Gale Crater Mount Sharp drilling & ancient lake bed evidence)"
  },
  {
    "id": "perseverance",
    "name": {
      "en": "Perseverance",
      "bn": "পারসিভিয়ারেন্স"
    },
    "mission": "Mars 2020",
    "body": "mars",
    "kind": "rover",
    "status": "active",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "2021-02-18",
      "verification": "verified",
      "sourceId": "cap:PIA24447"
    },
    "site": {
      "en": "Jezero crater · Octavia E. Butler Landing",
      "bn": "জেজেরো খাদ · অক্টাভিয়া ই. বাটলার ল্যান্ডিং"
    },
    "coordinates": {
      "lon": 77.45,
      "lat": 18.44,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Landed",
          "bn": "অবতরণ"
        },
        "value": {
          "en": "18 February 2021 · Jezero crater",
          "bn": "১৮ ফেব্রুয়ারি ২০২১ · জেজেরো খাদ"
        },
        "sourceId": "cap:PIA24447",
        "verification": "verified"
      },
      {
        "label": {
          "en": "First drive",
          "bn": "প্রথম চলা"
        },
        "value": {
          "en": "4 March 2021",
          "bn": "৪ মার্চ ২০২১"
        },
        "sourceId": "img:PIA24482",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Status",
          "bn": "অবস্থা"
        },
        "value": {
          "en": "Listed as active — Source verification required",
          "bn": "সক্রিয় হিসেবে তালিকাভুক্ত — উৎস যাচাই প্রয়োজন"
        },
        "sourceId": "nssdca:2020-052A",
        "verification": "required"
      }
    ],
    "sourceIds": [
      "img:PIA24542",
      "img:PIA24482",
      "cap:PIA24447",
      "nssdca:2020-052A"
    ],
    "imageId": "PIA24542",
    "storyTitle": {
      "en": "Collecting pieces of Mars",
      "bn": "মঙ্গলের টুকরো সংগ্রহ"
    },
    "storyDek": {
      "en": "Perseverance was designed to be the first mission to collect and cache Martian rock and regolith.",
      "bn": "পারসিভিয়ারেন্স নকশা করা হয়েছিল মঙ্গলের পাথর ও রেগোলিথ সংগ্রহ ও সংরক্ষণকারী প্রথম মিশন হিসেবে।"
    },
    "gameUsage": "Exhibit 15 & Rover Legacy (Jezero Crater river delta sampling & biosignature hunt)"
  },
  {
    "id": "ingenuity",
    "name": {
      "en": "Ingenuity Mars Helicopter",
      "bn": "ইনজেনুইটি মার্স হেলিকপ্টার"
    },
    "mission": "Mars 2020",
    "body": "mars",
    "kind": "helicopter",
    "status": "silent",
    "isClpsCommercial": false,
    "operator": "NASA",
    "arrived": {
      "date": "2021-02-18",
      "verification": "required",
      "sourceId": null
    },
    "site": {
      "en": "Jezero crater · “Valinor Hills” (final airfield)",
      "bn": "জেজেরো খাদ · “ভ্যালিনর হিলস” (শেষ বিমানক্ষেত্র)"
    },
    "coordinates": {
      "lon": null,
      "lat": null,
      "precision": "unknown",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Final flight",
          "bn": "শেষ উড্ডয়ন"
        },
        "value": {
          "en": "Flight 72, 18 January 2024",
          "bn": "উড্ডয়ন ৭২, ১৮ জানুয়ারি ২০২৪"
        },
        "sourceId": "img:PIA26236",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Most likely cause",
          "bn": "সবচেয়ে সম্ভাব্য কারণ"
        },
        "value": {
          "en": "Navigation found too few surface features; a hard touchdown on a sloping ripple snapped all four blades",
          "bn": "নেভিগেশন যথেষ্ট ভূচিহ্ন পায়নি; ঢালু বালির ঢেউয়ে কঠিন অবতরণে চারটি ব্লেডই ভেঙে যায়"
        },
        "sourceId": "img:PIA26482",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Final airfield",
          "bn": "শেষ বিমানক্ষেত্র"
        },
        "value": {
          "en": "“Valinor Hills”",
          "bn": "“ভ্যালিনর হিলস”"
        },
        "sourceId": "img:PIA26236",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Coordinates",
          "bn": "স্থানাঙ্ক"
        },
        "value": {
          "en": "Source verification required",
          "bn": "উৎস যাচাই প্রয়োজন"
        },
        "sourceId": null,
        "verification": "required"
      }
    ],
    "sourceIds": [
      "img:PIA26236",
      "img:PIA26482",
      "img:PIA24542"
    ],
    "imageId": "PIA26236",
    "storyTitle": {
      "en": "Seventy-two flights",
      "bn": "বাহাত্তরটি উড্ডয়ন"
    },
    "storyDek": {
      "en": "The first aircraft to fly on another planet ended its mission on a sand ripple.",
      "bn": "অন্য গ্রহে ওড়া প্রথম আকাশযান তার মিশন শেষ করল এক বালির ঢেউয়ের ওপর।"
    },
    "gameUsage": "Exhibit 16 & Rover Legacy (First powered atmospheric flight on another planet)"
  },
  {
    "id": "im-1",
    "name": {
      "en": "IM-1 Odysseus (NASA CLPS)",
      "bn": "আইএম-১ ওডিসিয়াস (নাসা সিএলপিএস)"
    },
    "mission": "IM-1",
    "body": "moon",
    "kind": "lander",
    "status": "silent",
    "isClpsCommercial": true,
    "operator": "Intuitive Machines (Commercial CLPS Contractor)",
    "arrived": {
      "date": "2024-02-22",
      "verification": "verified",
      "sourceId": "clps:im-1-nova"
    },
    "site": {
      "en": "Malapert A, south polar region",
      "bn": "ম্যালাপার্ট এ, দক্ষিণ মেরু অঞ্চল"
    },
    "coordinates": {
      "lon": 1.4,
      "lat": -80.1,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Landed Date",
          "bn": "অবতরণের তারিখ"
        },
        "value": {
          "en": "22 February 2024",
          "bn": "২২ ফেব্রুয়ারি ২০২৪"
        },
        "sourceId": "clps:im-1-nova",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Operator & Initiative",
          "bn": "পরিচালক ও উদ্যোগ"
        },
        "value": {
          "en": "Intuitive Machines (Nova-C) under NASA CLPS",
          "bn": "নাসা সিএলপিএস-এর অধীনে ইনটুইটিভ মেশিনস (নোভা-সি)"
        },
        "sourceId": "clps:im-1-mission",
        "verification": "verified"
      },
      {
        "label": {
          "en": "NASA Scientific Payloads",
          "bn": "নাসার বৈজ্ঞানিক পে-লোড"
        },
        "value": {
          "en": "6 NASA instruments (Doppler Lidar, radio astronomy, stereo cameras)",
          "bn": "৬টি নাসার যন্ত্র (ডপলার লিডার, রেডিও জ্যোতির্বিদ্যা, স্টেরিও ক্যামেরা)"
        },
        "sourceId": "clps:im-1-nova",
        "verification": "verified"
      }
    ],
    "sourceIds": [
      "clps:im-1-nova",
      "clps:im-1-mission"
    ],
    "imageId": null,
    "gameUsage": "Modern Lunar Exploration (Commercial Lunar Lander carrying 6 NASA CLPS payloads to Malapert A)"
  },
  {
    "id": "blue-ghost-1",
    "name": {
      "en": "Blue Ghost Mission 1 (NASA CLPS)",
      "bn": "ব্লু ঘোস্ট মিশন ১ (নাসা সিএলপিএস)"
    },
    "mission": "Blue Ghost M1",
    "body": "moon",
    "kind": "lander",
    "status": "silent",
    "isClpsCommercial": true,
    "operator": "Firefly Aerospace (Commercial CLPS Contractor)",
    "arrived": {
      "date": "2025-03-02",
      "verification": "verified",
      "sourceId": "clps:blue-ghost-1"
    },
    "site": {
      "en": "Mare Crisium",
      "bn": "মেয়ার ক্রিসিয়াম"
    },
    "coordinates": {
      "lon": 61.8,
      "lat": 18.6,
      "precision": "approx",
      "verification": "required"
    },
    "facts": [
      {
        "label": {
          "en": "Landed Date",
          "bn": "অবতরণের তারিখ"
        },
        "value": {
          "en": "2 March 2025",
          "bn": "২ মার্চ ২০২৫"
        },
        "sourceId": "clps:blue-ghost-1",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Operator & Task Order",
          "bn": "পরিচালক ও টাস্ক অর্ডার"
        },
        "value": {
          "en": "Firefly Aerospace under NASA CLPS initiative",
          "bn": "নাসা সিএলপিএস উদ্যোগের অধীনে ফায়ারফ্লাই অ্যারোস্পেস"
        },
        "sourceId": "clps:blue-ghost-1",
        "verification": "verified"
      },
      {
        "label": {
          "en": "Site & Scientific Goal",
          "bn": "স্থান ও বৈজ্ঞানিক লক্ষ্য"
        },
        "value": {
          "en": "Mare Crisium (10 NASA instruments: regolith drill & radiation detectors)",
          "bn": "মেয়ার ক্রিসিয়াম (১০টি নাসার যন্ত্র: রেগোলিথ ড্রিল ও বিকিরণ ডিটেক্টর)"
        },
        "sourceId": "clps:blue-ghost-1",
        "verification": "verified"
      }
    ],
    "sourceIds": [
      "clps:blue-ghost-1"
    ],
    "imageId": null,
    "gameUsage": "Modern Lunar Exploration (Commercial Lunar Lander carrying 10 NASA CLPS payloads to Mare Crisium)"
  }
];
