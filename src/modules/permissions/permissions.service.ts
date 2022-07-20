import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthZManagementService, AuthZRBACService } from 'nest-authz';
import { compareString } from 'src/common/utils/compareString';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly rbacSrv: AuthZRBACService,
    private readonly manageSrv: AuthZManagementService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  //Them permission vao data
  async addPermission(data: any) {
    const hasPermission = await this.manageSrv.hasPolicy(
      'entire',
      data.obj,
      data.act,
      data.eft,
    );
    if (hasPermission)
      throw new ConflictException('Permission already existed');

    await this.manageSrv.addPolicy('entire', data.obj, data.act, data.eft);
    // this.manageSrv.removePolicy('p', 'role_user', '/user', 'GET');
    return [data.obj, data.act, data.eft];
  }

  //Update Permission
  async updatePermission(data: any) {
    const allPolicy = await this.manageSrv.getFilteredPolicy(1, data.oldObj);
    if (allPolicy.length > 0) {
      let permission = 0;
      for (let i = 0; i < allPolicy.length; i++) {
        if (allPolicy[i][2] === data.oldAct) {
          permission = permission + 1;
          const p = [allPolicy[i][0], data.oldObj, data.oldAct];
          await this.manageSrv.removeFilteredNamedPolicy('p', 0, ...p);
          await this.manageSrv.addPolicy(
            allPolicy[i][0],
            data.newObj,
            data.newAct,
            allPolicy[i][3],
          );
        }
      }
      if (permission === 0) {
        throw new NotFoundException('Not found permission');
      }
    } else {
      throw new NotFoundException('Not found permission');
    }
    return 'update Permission!';
  }

  //get all permission
  async getAllPermission() {
    const allObjects = await this.manageSrv.getAllObjects();
    const permissions = [];
    if (allObjects.length > 0) {
      for (let i = 0; i < allObjects.length; i++) {
        const listAction = [];
        const policies = await this.manageSrv.getFilteredPolicy(
          1,
          allObjects[i],
        );
        if (policies.length > 0) {
          for (let j = 0; j < policies.length; j++) {
            if (!listAction.includes(policies[j][2])) {
              listAction.push(policies[j][2]);
              permissions.push([allObjects[i], policies[j][2], policies[j][3]]);
            }
          }
        }
      }
    }

    const sortPermissions = permissions.sort((item1, item2) => {
      if (compareString(item1[0], item2[0], false) === true) return -1;
      if (compareString(item1[0], item2[0], false) === false) return 1;
      if (compareString(item1[1], item2[1], false) === true) return -1;
      if (compareString(item1[1], item2[1], false) === false) return 1;
      return 0;
    });

    return sortPermissions;
  }

  //Delete Permission
  async deletePermission(oldObj: string, oldAct: string) {
    let existPermission = false;
    const allPolicy = await this.manageSrv.getFilteredPolicy(1, oldObj);
    if (allPolicy.length > 0) {
      for (let i = 0; i < allPolicy.length; i++) {
        if (allPolicy[i][2] === oldAct) {
          existPermission = true;
        }
      }
    }
    if (existPermission) {
      const p = [oldObj, oldAct];
      await this.manageSrv.removeFilteredNamedPolicy('p', 1, ...p);
      return [oldObj, oldAct, 'allow'];
    } else {
      throw new NotFoundException('Not found permission');
    }
  }

  //Add User to Permission
  async addUserToPermission(data: any) {
    const hasPermission = await this.manageSrv.hasPolicy(
      'entire',
      data.obj,
      data.act,
      'allow',
    );
    if (hasPermission) {
      const hasUserToPermission = await this.manageSrv.hasPolicy(
        data.user,
        data.obj,
        data.act,
        'deny',
      );
      if (hasUserToPermission) {
        await this.manageSrv.removePolicy(
          data.user,
          data.obj,
          data.act,
          'deny',
        );
        await this.manageSrv.addPolicy(data.user, data.obj, data.act, 'allow');
        return 'Add User to Permission';
      } else {
        await this.manageSrv.addPolicy(data.user, data.obj, data.act, 'allow');
        return 'Add User to Permission';
      }
    } else {
      throw new NotFoundException('Not found permission');
    }
  }

  //Delete User from Permission
  async deleteUserFromPermission(data: any) {
    const hasPermission = await this.manageSrv.hasPolicy(
      data.user,
      data.obj,
      data.act,
      'allow',
    );
    if (hasPermission) {
      await this.manageSrv.removePolicy(data.user, data.obj, data.act, 'allow');
      // await this.manageSrv.addPolicy(data.user, data.obj, data.act, 'deny');
      return 'Deleted User from Permission';
    } else {
      // await this.manageSrv.addPolicy(data.user, data.obj, data.act, 'deny');
      return 'Deleted User from Permission';
      // throw new NotFoundException('Not found User in Permission');
    }
  }

  //Delete User from Permission
  async deleteAllPermissionInUser(data: any) {
    await this.manageSrv.removeFilteredNamedPolicy('p', 0, data);
    // await this.manageSrv.addPolicy(data.user, data.obj, data.act, 'deny');
    return 'Deleted all Permission in User';
  }

  //Deny User from Permission
  async denyUserFromPermission(data: any) {
    const hasPermission = await this.manageSrv.hasPolicy(
      data.user,
      data.obj,
      data.act,
      'allow',
    );
    if (hasPermission) {
      await this.manageSrv.removePolicy(data.user, data.obj, data.act, 'allow');
      await this.manageSrv.addPolicy(data.user, data.obj, data.act, 'deny');
      return 'Deleted User from Permission';
    } else {
      await this.manageSrv.addPolicy(data.user, data.obj, data.act, 'deny');
      return 'Deleted User from Permission';
      // throw new NotFoundException('Not found User in Permission');
    }
  }

  //Get All Permission of User
  async getAllPermissionOfUser(user: any) {
    const listPermission = [];
    let newListPermission = [];
    const newListPermissionArray = [];
    const policies = await this.rbacSrv.getImplicitPermissionsForUser(user);
    if (policies.length > 0) {
      const permissionDenied = [];
      for (let i = 0; i < policies.length; i++) {
        const permission = `${policies[i][1]}_${policies[i][2]}_${policies[i][3]}`;
        if (!listPermission.includes(permission)) {
          if (policies[i][3] === 'deny') {
            permissionDenied.push(`${policies[i][1]}_${policies[i][2]}`);
            newListPermissionArray.push([
              policies[i][1],
              policies[i][2],
              policies[i][3],
            ]);
          }
          listPermission.push(permission);
        }
      }
      newListPermission = listPermission.filter((item) => {
        const index = item.lastIndexOf('_');
        const permission = item.slice(0, index);
        return !permissionDenied.includes(permission);
      });
      for (let i = 0; i < newListPermission.length; i++) {
        const firstIndex = newListPermission[i].indexOf('_');
        const lastIndex = newListPermission[i].lastIndexOf('_');
        const obj = newListPermission[i].slice(0, firstIndex);
        const act = newListPermission[i].slice(firstIndex + 1, lastIndex);
        const eft = newListPermission[i].slice(lastIndex + 1);
        newListPermissionArray.push([obj, act, eft]);
      }
    }
    return newListPermissionArray;
  }

  //Get Permission of User
  async getPermissionOfUser(user: any) {
    const permission = await this.manageSrv.getFilteredNamedPolicy(
      'p',
      0,
      user,
    );
    const newPermission = permission.map((item) => {
      return [item[1], item[2], item[3]];
    });
    return newPermission;
  }

  //Update Permission of User
  async updatePermissionOfUser(data: any) {
    const listPermissionOfUser = await this.getAllPermissionOfUser(data.user);
    if (listPermissionOfUser.length > 0) {
      const listPermissionStr = [];
      let canDelete = true;
      let canAdd = true;
      listPermissionOfUser.forEach((item) => {
        listPermissionStr.push(`${item[0]}_${item[1]}_${item[2]}`);
      });
      for (let i = 0; i < data.listPermissionDelete.length; i++) {
        if (
          listPermissionStr.includes(
            `${data.listPermissionDelete[i].obj}_${data.listPermissionDelete[i].act}_allow`,
          ) === false
        ) {
          canDelete = false;
          break;
        }
      }

      for (let i = 0; i < data.listPermissionAdd.length; i++) {
        const hasPermission = await this.manageSrv.hasPolicy(
          'entire',
          data.listPermissionAdd[i].obj,
          data.listPermissionAdd[i].act,
          'allow',
        );
        if (!hasPermission) {
          canAdd = false;
          break;
        }
      }
      if (canAdd && canDelete) {
        for (let i = 0; i < data.listPermissionDelete.length; i++) {
          await this.deleteUserFromPermission({
            user: data.user,
            obj: data.listPermissionDelete[i].obj,
            act: data.listPermissionDelete[i].act,
          });
        }

        for (let i = 0; i < data.listPermissionAdd.length; i++) {
          await this.addUserToPermission({
            user: data.user,
            obj: data.listPermissionAdd[i].obj,
            act: data.listPermissionAdd[i].act,
          });
        }
        return 'Update Permission Of User';
      } else {
        throw new NotFoundException('Data wrong');
      }
    } else {
      if (data.listPermissionDelete.length > 0) {
        throw new NotFoundException('Data to Delete Wrong');
      }
      let canAdd = true;
      for (let i = 0; i < data.listPermissionAdd.length; i++) {
        const hasPermission = await this.manageSrv.hasPolicy(
          'entire',
          data.listPermissionAdd[i].obj,
          data.listPermissionAdd[i].act,
          'allow',
        );
        if (!hasPermission) {
          canAdd = false;
          break;
        }
      }
      if (canAdd) {
        for (let i = 0; i < data.listPermissionAdd.length; i++) {
          await this.addUserToPermission({
            user: data.user,
            obj: data.listPermissionAdd[i].obj,
            act: data.listPermissionAdd[i].act,
          });
        }
        return 'Update Permission Of User';
      } else {
        throw new NotFoundException('Data to Add Wrong');
      }
    }
  }

  async getPermissionOfUserForFontend(user: any) {
    const permissionOfUser = await this.getAllPermissionOfUser(user);
    const permissionFormat = {
      read: [],
      update: [],
      delete: [],
      create: [],
    };
    permissionOfUser.forEach((item) => {
      if (item[1].includes('read') && item[2] === 'allow') {
        permissionFormat.read.push(item[0]);
      }
      if (item[1].includes('create') && item[2] === 'allow') {
        permissionFormat.create.push(item[0]);
      }
      if (item[1].includes('update') && item[2] === 'allow') {
        permissionFormat.update.push(item[0]);
      }
      if (item[1].includes('delete') && item[2] === 'allow') {
        permissionFormat.delete.push(item[0]);
      }
    });
    return permissionFormat;
  }
}
