package com.fenglema.scp.resource;

import com.fenglema.scp.common.ApiResponse;
import com.fenglema.scp.common.Perm;
import com.fenglema.scp.common.Rows;
import jakarta.validation.constraints.NotBlank;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/employees")
public class EmployeeController {

    private final JdbcClient db;

    public EmployeeController(JdbcClient db) {
        this.db = db;
    }

    @GetMapping
    @Perm(module = "staff")
    public ApiResponse<List<Map<String, Object>>> list(@RequestParam(required = false) String jobRole) {
        return ApiResponse.ok(db.sql("""
                        SELECT e.*,
                               (SELECT COALESCE(jsonb_agg(DISTINCT gs.group_id), '[]'::jsonb) FROM group_staffing gs WHERE gs.employee_id = e.id) AS serving_groups,
                               (SELECT COALESCE(jsonb_agg(DISTINCT a.id), '[]'::jsonb) FROM account a WHERE a.user_employee_id = e.id) AS using_accounts
                        FROM employee e
                        WHERE (CAST(:role AS text) IS NULL OR e.job_role = :role)
                        ORDER BY e.emp_no
                        """)
                .param("role", jobRole)
                .query(Rows.MAP).list());
    }

    public record CreateEmployee(@NotBlank String empNo, @NotBlank String name, String gender, String phone,
                                 String department, String jobRole, String serviceRegion) {
    }

    @PostMapping
    @Perm(module = "staff", action = Perm.Action.CREATE)
    public ApiResponse<Map<String, Object>> create(@RequestBody CreateEmployee req) {
        Long id = db.sql("""
                        INSERT INTO employee (emp_no, name, gender, phone, department, job_role, service_region)
                        VALUES (:no, :name, :gender, :phone, :dept, :role, :region) RETURNING id
                        """)
                .param("no", req.empNo()).param("name", req.name()).param("gender", req.gender())
                .param("phone", req.phone()).param("dept", req.department())
                .param("role", req.jobRole()).param("region", req.serviceRegion())
                .query(Long.class).single();
        return ApiResponse.ok(db.sql("SELECT * FROM employee WHERE id = :id").param("id", id).query(Rows.MAP).single());
    }
}
