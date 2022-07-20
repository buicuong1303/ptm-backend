/* eslint-disable @typescript-eslint/no-unused-vars */

//TODO: need research to config mapping option
//TODO: need add elasticsearch-analysis-vietnamese

export const esIndexs = {
  message: {
    index: 'messages',
    settings: {
      analysis: {
        analyzer: {
          my_analyzer: {
            type: 'custom',
            tokenizer: 'vi_tokenizer',
            char_filter: ['html_strip', 'my_char_filter'],
            filter: ['icu_folding', 'lowercase'],
          },
        },
        char_filter: {
          my_char_filter: {
            type: 'mapping',
            mappings: ['\\n => _'],
          },
        },
      },
    },
    mapping: {
      properties: {
        id: {
          type: 'text',
        },
        text: {
          type: 'text',
          analyzer: 'my_analyzer',
          boost: 3,
        },
        direction: {
          type: 'text',
          index: false,
        },
        attachments: {
          properties: {
            name: {
              type: 'text',
              analyzer: 'my_analyzer',
              boost: 3,
            },
            url: {
              type: 'text',
              index: false,
            },
            category: {
              type: 'text',
              index: false,
            },
            format: {
              type: 'text',
              index: false,
            },
          },
        },
        creationUser: {
          properties: {
            id: {
              type: 'keyword',
              index: false,
            },
            firstName: {
              type: 'text',
              index: false,
            },
            lastName: {
              type: 'text',
              index: false,
            },
            avatar: {
              type: 'text',
              index: false,
            },
          },
        },
        creationTime: {
          type: 'date',
        },
        lastModifiedTime: {
          type: 'date',
        },
        conversation: {
          properties: {
            id: {
              type: 'keyword',
              index: false,
            },
            companyCustomer: {
              properties: {
                id: {
                  type: 'keyword',
                  index: false,
                },
                customer: {
                  properties: {
                    id: {
                      type: 'keyword',
                      index: false,
                    },
                    phoneNumber: {
                      type: 'text',
                      index: false,
                    },
                  },
                },
                company: {
                  properties: {
                    id: {
                      type: 'keyword',
                      index: false,
                    },
                    name: {
                      type: 'text',
                      index: false,
                    },
                    code: {
                      type: 'text',
                    },
                  },
                },
              },
            },
          },
        },
        messageStatus: {
          type: 'text',
          index: false,
        },
        exMessageStatus: {
          type: 'text',
          index: false,
        },
      },
    },
  },
};
