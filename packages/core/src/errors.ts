export class CommandNotImplementedError extends Error {
  constructor(command: string) {
    super(`${command} is not implemented yet`);
    this.name = "CommandNotImplementedError";
  }
}
