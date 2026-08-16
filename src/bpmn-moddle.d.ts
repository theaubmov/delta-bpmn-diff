declare module 'bpmn-moddle' {
  interface ParseResult {
    rootElement: unknown;
    warnings: Array<{ message: string }>;
  }

  export class BpmnModdle {
    fromXML(xml: string): Promise<ParseResult>;
  }
}
