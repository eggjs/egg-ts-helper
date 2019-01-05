import { cleanJs } from '../utils';

class CleanCommand implements SubCommand {
  description = 'Clean js file while it has the same name ts file';

  async run(_, { cwd }: SubCommandOption) {
    cleanJs(cwd);
  }
}

export default new CleanCommand();
