import { COUNTRIES } from "./countries";
import { PHONE_CONTACTS } from "./mock";

test("COUNTRIES has 12 entries starting with India", () => {
  expect(COUNTRIES).toHaveLength(12);
  expect(COUNTRIES[0]).toEqual({ code: "IN", name: "India", dial: "+91", flag: "🇮🇳", digits: 10 });
});

test("PHONE_CONTACTS has 7 entries starting with Amma", () => {
  expect(PHONE_CONTACTS).toHaveLength(7);
  expect(PHONE_CONTACTS[0]).toEqual({
    id: "c1",
    name: "Amma",
    initials: "AM",
    phone: "+91 98450 11234",
    relation: "Mother",
  });
});
