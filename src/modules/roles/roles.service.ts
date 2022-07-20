import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthZManagementService, AuthZRBACService } from 'nest-authz';

@Injectable()
export class RolesService {
  constructor(
    private readonly rbacSrv: AuthZRBACService,
    private readonly manageSrv: AuthZManagementService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  //Add Role
  async addRole(data: any) {
    const allRoles = await this.manageSrv.getAllSubjects();
    const hasRole = allRoles.includes(`role_${data.role}`);
    if (hasRole) throw new ConflictException('Role already existed');
    await this.manageSrv.addPolicy(
      `role_${data.role}`,
      '/users',
      'read:any',
      'allow',
    );
    const response = await this.updatePermissionOfRole({
      roleName: data.role,
      listPermissionDelete: data.listPermissionDelete,
      listPermissionAdd: data.listPermissionAdd,
    });
    return response;
  }

  //Add Role for User
  async addRoleForUser(data: any) {
    const allRoles = await this.manageSrv.getAllSubjects();
    const hasRole = allRoles.includes(`role_${data.role}`);
    if (hasRole) {
      await this.rbacSrv.addRoleForUser(data.user, `role_${data.role}`);
      return 'Add Role for User';
    } else {
      throw new NotFoundException('Not found Role');
    }
  }

  //Add Permission to Role
  async addPermissionToRole(data: any) {
    const allPolicyOfRole = await this.manageSrv.getFilteredNamedPolicy(
      'p',
      0,
      `role_${data.role}`,
    );
    if (allPolicyOfRole.length > 0) {
      // const hasPolicyOfPermission = await this.manageSrv.hasPolicy(
      //   'entire',
      //   data.obj,
      //   data.act,
      //   'allow',
      // );
      const hasPolicy = await this.manageSrv.hasPolicy(
        `entire`,
        data.obj,
        data.act,
        'allow',
      );
      if (hasPolicy === true) {
        await this.manageSrv.addPolicy(
          `role_${data.role}`,
          data.obj,
          data.act,
          'allow',
        );
        return 'Add Permission to Role';
      } else {
        throw new NotFoundException('Not found Permission');
      }
    } else {
      throw new NotFoundException('Not found Role');
    }
  }

  //   Update Role
  async updateRole(data: any) {
    const allRoles = await this.manageSrv.getAllSubjects();
    const hasRole = allRoles.includes(`role_${data.oldRole}`);
    if (hasRole) {
      const allPolicyOfRole = await this.manageSrv.getFilteredNamedPolicy(
        'p',
        0,
        `role_${data.oldRole}`,
      );
      for (let i = 0; i < allPolicyOfRole.length; i++) {
        await this.manageSrv.removePolicy(
          allPolicyOfRole[i][0],
          allPolicyOfRole[i][1],
          allPolicyOfRole[i][2],
          allPolicyOfRole[i][3],
        );
        await this.manageSrv.addPolicy(
          `role_${data.newRole}`,
          allPolicyOfRole[i][1],
          allPolicyOfRole[i][2],
          allPolicyOfRole[i][3],
        );
      }
      const gruop = await this.manageSrv.getFilteredGroupingPolicy(
        1,
        `role_${data.oldRole}`,
      );
      if (gruop.length > 0) {
        for (let j = 0; j < gruop.length; j++) {
          await this.manageSrv.removeGroupingPolicy(gruop[j][0], gruop[j][1]);
          await this.manageSrv.addGroupingPolicy(
            gruop[j][0],
            `role_${data.newRole}`,
          );
        }
      }
      return 'Update Role';
    } else {
      throw new NotFoundException('Not found Role');
    }
  }

  //Update Permission of Role
  async updatePermissionOfRole(data: any) {
    const hasRole = await this.manageSrv.getFilteredNamedPolicy(
      'p',
      0,
      `role_${data.roleName}`,
    );
    if (hasRole.length > 0) {
      let canAdd = true;
      let canDelete = true;
      for (let i = 0; i < data.listPermissionAdd.length; i++) {
        const hasPermission = await this.manageSrv.hasPolicy(
          'entire',
          data.listPermissionAdd[i].obj,
          data.listPermissionAdd[i].act,
          'allow',
        );
        if (hasPermission === false) {
          canAdd = false;
          break;
        }
      }
      for (let i = 0; i < data.listPermissionDelete.length; i++) {
        const hasPolicy = await this.manageSrv.hasPolicy(
          `role_${data.roleName}`,
          data.listPermissionDelete[i].obj,
          data.listPermissionDelete[i].act,
          'allow',
        );
        if (!hasPolicy) {
          canDelete = false;
          break;
        }
      }
      if (canAdd && canDelete) {
        if (data.listPermissionAdd.length > 0) {
          for (let i = 0; i < data.listPermissionAdd.length; i++) {
            const dataAdd = {
              role: data.roleName,
              obj: data.listPermissionAdd[i].obj,
              act: data.listPermissionAdd[i].act,
            };
            await this.addPermissionToRole(dataAdd);
          }
        }
        if (data.listPermissionDelete.length > 0) {
          for (let i = 0; i < data.listPermissionDelete.length; i++) {
            const dataDelete = {
              role: data.roleName,
              obj: data.listPermissionDelete[i].obj,
              act: data.listPermissionDelete[i].act,
            };
            await this.deletePermissionInRole(dataDelete);
          }
        }
        return 'Update Permission in Role';
      } else {
        throw new NotFoundException(`Data wrong`);
      }
    } else {
      throw new NotFoundException('Not found Role');
    }
  }

  //Update Role of User
  async updateRoleOfUser(data: any) {
    const hasRoleInUser = await this.manageSrv.getFilteredNamedGroupingPolicy(
      'g',
      0,
      data.user,
    );
    if (hasRoleInUser.length > 0) {
      let canDelete = true;
      let canAdd = true;
      for (let i = 0; i < data.listRoleDelete.length; i++) {
        const hasPermission = await this.manageSrv.hasNamedGroupingPolicy(
          'g',
          data.user,
          `role_${data.listRoleDelete[i]}`,
        );
        if (hasPermission === false) {
          canDelete = false;
          break;
        }
      }
      for (let i = 0; i < data.listRoleAdd.length; i++) {
        const hasRole = await this.manageSrv.getFilteredNamedPolicy(
          'p',
          0,
          `role_${data.listRoleAdd[i]}`,
        );
        if ((hasRole.length = 0)) {
          canAdd = false;
          break;
        }
      }
      if (canAdd && canDelete) {
        if (data.listRoleDelete.length > 0) {
          for (let i = 0; i < data.listRoleDelete.length; i++) {
            await this.deleteUserOfRole({
              user: data.user,
              role: data.listRoleDelete[i],
            });
          }
        }
        if (data.listRoleAdd.length > 0) {
          for (let i = 0; i < data.listRoleAdd.length; i++) {
            await this.addRoleForUser({
              user: data.user,
              role: data.listRoleAdd[i],
            });
          }
        }
        return 'Update Role of User!!';
      } else {
        throw new NotFoundException('Data wrong');
      }
    } else {
      if (data.listRoleDelete.length > 0) {
        throw new NotFoundException('Data list role to delete wrong');
      }
      let canAdd = true;
      for (let i = 0; i < data.listRoleAdd.length; i++) {
        const hasRole = await this.manageSrv.getFilteredNamedPolicy(
          'p',
          0,
          `role_${data.listRoleAdd[i]}`,
        );
        if ((hasRole.length = 0)) {
          canAdd = false;
          break;
        }
      }
      if (canAdd) {
        if (data.listRoleAdd.length > 0) {
          for (let i = 0; i < data.listRoleAdd.length; i++) {
            await this.addRoleForUser({
              user: data.user,
              role: data.listRoleAdd[i],
            });
          }
        }
        return 'Update Role of User!!';
      }
      throw new NotFoundException('Not found User of Role');
    }
  }

  //Delete Permission in Role
  async deletePermissionInRole(data: any) {
    const hasPolicy = await this.manageSrv.hasPolicy(
      `role_${data.role}`,
      data.obj,
      data.act,
      'allow',
    );
    if (hasPolicy) {
      await this.manageSrv.removePolicy(
        `role_${data.role}`,
        data.obj,
        data.act,
        'allow',
      );
      return 'Delete Permission in Role';
    } else {
      throw new NotFoundException('Not found Policy');
    }
  }

  //Delete Role
  async deleteRole(data: any) {
    const allPolicyRole = await this.manageSrv.getFilteredNamedPolicy(
      'p',
      0,
      `role_${data}`,
    );
    if (allPolicyRole.length > 0) {
      for (let i = 0; i < allPolicyRole.length; i++) {
        await this.manageSrv.removeFilteredPolicy(
          0,
          `role_${data}`,
          allPolicyRole[i][1],
          allPolicyRole[i][2],
          allPolicyRole[i][3],
        );
      }
      const roleGroup = await this.manageSrv.getFilteredNamedGroupingPolicy(
        'g',
        1,
        `role_${data}`,
      );
      if (roleGroup.length > 0) {
        await this.manageSrv.removeFilteredGroupingPolicy(1, `role_${data}`);
      }
      return 'Delete Role';
    } else {
      throw new NotFoundException('Not found role');
    }
  }

  //Delete User of Role
  async deleteUserOfRole(data: any) {
    const hasGroup = await this.manageSrv.hasNamedGroupingPolicy(
      'g',
      data.user,
      `role_${data.role}`,
    );
    if (hasGroup) {
      await this.manageSrv.removeGroupingPolicy(data.user, `role_${data.role}`);
      return 'Delete User from Role';
    } else {
      throw new NotFoundException('Not found User of Role');
    }
  }

  //Delete All role in User
  async deleteAllRoleInUser(data: any) {
    await this.manageSrv.removeFilteredNamedPolicy('g', 0, data);
    return 'Delete User from Role';
  }

  //Get all Role
  async getAllRole() {
    const allSubjects = await this.manageSrv.getAllSubjects();
    const allRole = allSubjects.filter((item) => {
      return item.includes('role_');
    });
    const roles = allRole.map(async (item) => {
      return await this.getRoleByRolename(item);
    });
    return Promise.all(roles);
  }

  //Get Permission of Role
  async getPermissionOfRole(role: any) {
    const permissions = await this.rbacSrv.getPermissionsForUser(role);
    if (permissions.length > 0) {
      const newPermission = permissions.map((item) => {
        return [
          item[1],
          item[2].slice(0, item[2].indexOf(':')),
          item[3],
          'any',
        ];
      });
      return newPermission;
    } else {
      throw new NotFoundException(`Not found permission`);
    }
  }

  //Get Role of User
  async getRoleOfUser(user: any) {
    // if (user === '') {
    //   return [];
    // }
    const roleOfUser = await this.rbacSrv.getRolesForUser(`${user}`);
    if (roleOfUser.length > 0) {
      return roleOfUser;
    } else {
      return [];
    }
  }

  //Get User in Role
  async getUserInRole(role: any) {
    const userInRole = [];
    const policyOfRole = await this.manageSrv.getFilteredNamedGroupingPolicy(
      'g',
      1,
      role,
    );
    if (policyOfRole.length > 0) {
      policyOfRole.forEach((item) => {
        userInRole.push(item[0]);
      });
    }
    return userInRole;
  }

  //Get Role by Role's name
  async getRoleByRolename(roleName: any) {
    const hasRole = await this.manageSrv.getFilteredNamedPolicy(
      'p',
      0,
      roleName,
    );
    if (hasRole.length > 0) {
      const permissionOfRole = await this.getPermissionOfRole(roleName);
      const userOfRole = await this.getUserInRole(roleName);
      return {
        role: roleName,
        permissions: permissionOfRole,
        users: userOfRole,
      };
    }
  }
}
