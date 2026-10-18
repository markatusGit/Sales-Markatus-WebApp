/** Writable HQ v2 fields. Source: https://api.hellohq.io/swagger/v2/swagger.json; checked 2026-10-18. */
const SALES_HQ_FIELDS={
  "CompanyPut": {
    "type": "object",
    "required": [
      "name"
    ],
    "properties": {
      "name": {
        "type": "string",
        "minLength": 1
      },
      "industrialSector": {
        "type": "string",
        "nullable": true
      },
      "description": {
        "type": "string",
        "nullable": true
      },
      "iban": {
        "type": "string",
        "nullable": true
      },
      "bic": {
        "type": "string",
        "nullable": true
      },
      "homepage": {
        "type": "string",
        "nullable": true
      },
      "vatId": {
        "type": "string",
        "nullable": true
      },
      "financesChargeRateId": {
        "type": "integer",
        "nullable": true,
        "format": "int32"
      },
      "standardDeliveryConditionId": {
        "type": "integer",
        "nullable": true,
        "format": "int32",
        "deprecated": true
      },
      "standardPaymentConditionId": {
        "type": "integer",
        "nullable": true,
        "format": "int32",
        "deprecated": true
      },
      "debitorNumber": {
        "type": "integer",
        "nullable": true,
        "format": "int32"
      },
      "creditorNumber": {
        "type": "integer",
        "nullable": true,
        "format": "int32"
      },
      "documentDefaultMailEntityId": {
        "type": "integer",
        "nullable": true,
        "format": "int32"
      },
      "routingId": {
        "type": "string",
        "nullable": true
      },
      "eInvoiceType": {
        "type": "string",
        "enum": [
          "None",
          "XRechnung"
        ]
      },
      "customFields": {
        "type": "array",
        "nullable": true,
        "items": {
          "type": "object",
          "required": [
            "name",
            "type"
          ],
          "properties": {
            "name": {
              "type": "string",
              "minLength": 1
            },
            "type": {
              "type": "string",
              "enum": [
                "Text",
                "TextMultiline",
                "Date",
                "Dropdown",
                "DropdownCheckbox",
                "Boolean",
                "Upload",
                "UserSelection",
                "CompanySelection",
                "ProjectSelection",
                "ResourceSelection",
                "ContactSelection",
                "Link",
                "Float",
                "Integer",
                "Token",
                "NumericText"
              ]
            },
            "value": {
              "nullable": true
            }
          }
        }
      }
    }
  },
  "CompanyAddressBase": {
    "type": "object",
    "required": [
      "city",
      "country",
      "description",
      "street",
      "zipCode"
    ],
    "properties": {
      "alternativeCompanyName": {
        "type": "string",
        "nullable": true
      },
      "additionalInformation": {
        "type": "string",
        "nullable": true
      },
      "street": {
        "type": "string",
        "minLength": 1
      },
      "houseNumber": {
        "type": "string",
        "nullable": true
      },
      "zipCode": {
        "type": "string",
        "minLength": 1
      },
      "city": {
        "type": "string",
        "minLength": 1
      },
      "country": {
        "type": "string",
        "minLength": 1
      },
      "description": {
        "type": "string",
        "minLength": 1
      },
      "phone": {
        "type": "string",
        "nullable": true
      },
      "email": {
        "type": "string",
        "nullable": true
      },
      "fax": {
        "type": "string",
        "nullable": true
      },
      "website": {
        "type": "string",
        "nullable": true
      },
      "addressLine2": {
        "type": "string",
        "nullable": true
      },
      "standardForDocumentType": {
        "type": "string",
        "enum": [
          "Quotation",
          "Invoice",
          "DeliveryNote",
          "Warning",
          "Reminder",
          "Cancellation",
          "CreditNote",
          "Confirmation",
          "IncomingInvoice",
          "Undefined",
          "Order",
          "PriceInquiry",
          "Letter",
          "Minute",
          "AdvancedInvoice",
          "PlannedRevenueStandard",
          "PlannedRevenueTimeAndMaterial",
          "PlannedCost",
          "FinalInvoice"
        ]
      }
    }
  },
  "ContactPersonPut": {
    "type": "object",
    "properties": {
      "firstName": {
        "type": "string",
        "nullable": true
      },
      "lastName": {
        "type": "string",
        "nullable": true
      },
      "position": {
        "type": "string",
        "nullable": true
      },
      "phoneLandline": {
        "type": "string",
        "nullable": true
      },
      "phoneMobile": {
        "type": "string",
        "nullable": true
      },
      "eMail": {
        "type": "string",
        "nullable": true
      },
      "salutation": {
        "type": "string",
        "nullable": true
      },
      "salutationForm": {
        "type": "string",
        "enum": [
          "Formal",
          "Informal",
          "Neutral"
        ]
      },
      "language": {
        "type": "string",
        "nullable": true
      },
      "birthdate": {
        "type": "string",
        "nullable": true
      },
      "note": {
        "type": "string",
        "nullable": true
      },
      "defaultAddress": {
        "type": "object",
        "required": [
          "city",
          "country",
          "description",
          "street",
          "zipCode"
        ],
        "properties": {
          "alternativeCompanyName": {
            "type": "string",
            "nullable": true
          },
          "additionalInformation": {
            "type": "string",
            "nullable": true
          },
          "street": {
            "type": "string",
            "minLength": 1
          },
          "houseNumber": {
            "type": "string",
            "nullable": true
          },
          "zipCode": {
            "type": "string",
            "minLength": 1
          },
          "city": {
            "type": "string",
            "minLength": 1
          },
          "country": {
            "type": "string",
            "minLength": 1
          },
          "description": {
            "type": "string",
            "minLength": 1
          },
          "phone": {
            "type": "string",
            "nullable": true
          },
          "email": {
            "type": "string",
            "nullable": true
          },
          "fax": {
            "type": "string",
            "nullable": true
          },
          "website": {
            "type": "string",
            "nullable": true
          },
          "addressLine2": {
            "type": "string",
            "nullable": true
          },
          "standardForDocumentType": {
            "type": "string",
            "enum": [
              "Quotation",
              "Invoice",
              "DeliveryNote",
              "Warning",
              "Reminder",
              "Cancellation",
              "CreditNote",
              "Confirmation",
              "IncomingInvoice",
              "Undefined",
              "Order",
              "PriceInquiry",
              "Letter",
              "Minute",
              "AdvancedInvoice",
              "PlannedRevenueStandard",
              "PlannedRevenueTimeAndMaterial",
              "PlannedCost",
              "FinalInvoice"
            ]
          }
        }
      },
      "customFields": {
        "type": "array",
        "nullable": true,
        "items": {
          "type": "object",
          "required": [
            "name",
            "type"
          ],
          "properties": {
            "name": {
              "type": "string",
              "minLength": 1
            },
            "type": {
              "type": "string",
              "enum": [
                "Text",
                "TextMultiline",
                "Date",
                "Dropdown",
                "DropdownCheckbox",
                "Boolean",
                "Upload",
                "UserSelection",
                "CompanySelection",
                "ProjectSelection",
                "ResourceSelection",
                "ContactSelection",
                "Link",
                "Float",
                "Integer",
                "Token",
                "NumericText"
              ]
            },
            "value": {
              "nullable": true
            }
          }
        }
      }
    }
  },
  "CompanyTypeToCompaniesPutWithoutNumberSchema": {
    "type": "object",
    "required": [
      "companyTypeId"
    ],
    "properties": {
      "number": {
        "type": "string",
        "nullable": true
      },
      "companyTypeId": {
        "type": "integer",
        "format": "int32"
      }
    }
  }
};
